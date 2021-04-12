const fs = require('fs')
const ora = require('ora')
const inquirer = require('inquirer')
const archiver = require('archiver')
const { NodeSSH } = require('node-ssh')
const childProcess = require('child_process')
const { deployConfigPath } = require('../config')

const {
  checkDeployConfigExists,
  log,
  succeed,
  error,
  underline
} = require('../utils')
const { resolve } = require('path')

const ssh = new NodeSSH()
const maxBuffer = 5000 * 1024

// 任务列表
let taskList

// 是否确认部署
const confirmDeploy = (message) => {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message
    }
  ])
}

// 检查环境是否正确
const checkEnvCorrect = (config, env) => {

  const keys = [
    'name',
    'distPath',
  ]

  const serverKeys = [
    'privateKey',
    'host',
    'port',
    'username',
    'password',
    'webDir',
    'remoteBeforeCommand',
    'remoteAfterCommand',
    'uploadCommand'
  ];

  const serverRequiredKeys = [
    'host',
    'port',
    'username',
    'webDir',
  ];

  if (
    config &&
    (function () {
      const { privateKey, password, servers } = config
      if (!privateKey && !password && !(servers && servers.length > 0 && servers[0].password)) {
        error(
          `配置错误: 请配置 ${underline('privateKey')} 或 ${underline(
            'passwrod'
          )}`
        )
        process.exit(1)
      }
      return true
    })()
  ) {

    if (!(config.servers && config.servers.length)) {
      config.servers = [{}];
    }

    // 填充server字段
    config.servers.forEach(server => {
      serverKeys.forEach(key => {
        if ('undefined' !== typeof config[key] && 'undefined' === typeof server[key]) {
          server[key] = config[key];
        }
      })
    });

    keys.forEach((key) => {
      if (!config[key] || config[key] === '/') {
        error(
          `配置错误: ${underline(`${env}环境`)} ${underline(
            `${key}属性`
          )} 配置不正确`
        )
        process.exit(1)
      }
    })

    // 校验server信息
    config.servers.forEach(server => {
      serverRequiredKeys.forEach(key => {
        if (!server[key] || server[key] === '/') {
          error(
            `配置错误: ${underline(`${env}环境`)} ${underline(
              `${key}属性`
            )} 配置不正确`
          )
          process.exit(1)
        }
      })
    });

    console.log(config);

  } else {
    error('配置错误: 未指定部署环境或指定部署环境不存在')
    process.exit(1)
  }
}

// 执行打包脚本
const execBuild = async (config, index) => {
  try {
    const { script } = config
    log(`(${index}) ${script}`)
    const spinner = ora('正在打包中\n')

    spinner.start()

    await new Promise((resolve, reject) => {
      childProcess.exec(
        script,
        { cwd: process.cwd(), maxBuffer: maxBuffer },
        (e) => {
          spinner.stop()
          if (e === null) {
            succeed('打包成功')
            resolve()
          } else {
            reject(e.message)
          }
        }
      )
    })
  } catch (e) {
    error('打包失败')
    error(e)
    process.exit(1)
  }
}

// 打包Zip
const buildZip = async (config, index) => {
  await new Promise((resolve, reject) => {
    log(`(${index}) 打包 ${underline(config.distPath)} Zip`)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    }).on('error', (e) => {
      error(e)
    })

    const output = fs
      .createWriteStream(`${process.cwd()}/${config.distPath}.zip`)
      .on('close', (e) => {
        if (e) {
          error(`打包zip出错: ${e}`)
          reject(e)
          process.exit(1)
        } else {
          succeed(`${underline(`${config.distPath}.zip`)} 打包成功`)
          resolve()
        }
      })

    archive.pipe(output)
    archive.directory(config.distPath, false)
    archive.finalize()
  })
}

// 连接ssh
const connectSSH = (server) => async (config, index) => {
  try {
    log(`(${index}) ssh连接 ${underline(server.host)}`)
    await ssh.connect(server)
    succeed('ssh连接成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 上传本地文件
const uploadLocalFile = (server) => async (config, index) => {
  try {
    const { webDir, host } = server;

    const localFileName = `${config.distPath}.zip`
    const remoteFileName = `${webDir}.zip`
    const localPath = `${process.cwd()}/${localFileName}`

    log(`(${index}) 上传打包zip至目录 ${host} ${underline(remoteFileName)}`)

    const spinner = ora('正在上传中\n')

    spinner.start()

    await ssh.putFile(localPath, remoteFileName, null, {
      concurrency: 1
    })

    spinner.stop()
    succeed('上传成功')
  } catch (e) {
    error(`上传失败: ${e}`)
    process.exit(1)
  }
}

// 删除远程文件
const removeRemoteFile = (server) => async (config, index) => {
  try {
    const { webDir, host } = server

    log(`(${index}) 删除远程文件 ${host} ${underline(webDir)}`)

    await ssh.execCommand(`rm -rf ${webDir}`)

    succeed('删除成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 执行后置远程命令
const runAfterRemoteCommand = (server) => async (config, index) => {
  try {
    const { remoteAfterCommand, host } = server

    log(`(${index}) 执行后置远程命令 ${host} ${underline(remoteAfterCommand)}`)

    const result = await ssh.execCommand(remoteAfterCommand)


    if (result.stdout) {
      log(result.stdout)
    }

    if (result.stderr) {
      error(result.stderr)
    }
    if (result.code) {
      error('执行后置远程命令失败')
      const answers = await confirmDeploy(
        `${underline(projectName)} 执行后置远程命令失败 是否继续?`
      )

      if (!answers.confirm) {
        process.exit(1)
      }
    }

    succeed('执行后置远程命令成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 执行前置远程命令
const runBeforeRemoteCommand = (server) => async (config, index) => {
  try {
    const { remoteBeforeCommand, host } = server

    log(`(${index}) 执行前置远程命令 ${host} ${underline(remoteBeforeCommand)}`)

    const result = await ssh.execCommand(remoteBeforeCommand)

    if (result.stdout) {
      log(result.stdout)
    }

    if (result.stderr) {
      error(result.stderr)
    }
    if (result.code) {
      error('执行前置远程命令失败')

      const answers = await confirmDeploy(
        `${underline(projectName)} 执行前置远程命令失败 是否继续?`
      )

      if (!answers.confirm) {
        process.exit(1)
      }
    }

    succeed('执行前置远程命令成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}


// 执行本地命令
const runLocalCommand = (tip, command) => async (config, index) => {
  try {

    log(`(${index}) ${tip} ${underline(command)}`)

    return new Promise((resolve, reject) => {
      childProcess.exec(
        command,
        { cwd: process.cwd(), maxBuffer: maxBuffer },
        (e, stdout, stderr) => {
          if (e === null) {
            log(stdout);
            succeed(`${tip}成功`)
            resolve()
          } else {
            log(stderr);
            reject(e.message)
          }
        }
      )
    });
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 解压远程文件
const unzipRemoteFile = (server) => async (config, index) => {
  try {
    const { webDir, host } = server
    const remoteFileName = `${webDir}.zip`

    log(`(${index}) 解压远程文件 ${host} ${underline(remoteFileName)}`)

    await ssh.execCommand(
      `unzip -o ${remoteFileName} -d ${webDir} && rm -rf ${remoteFileName}`
    )

    succeed('解压成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 删除本地打包文件
const removeLocalBuildFile = (config, index) => {
  const localPath = `${process.cwd()}/${config.distPath}`

  log(`(${index}) 删除本地打包目录 ${underline(localPath)}`)

  const remove = (path) => {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach((file) => {
        let currentPath = `${path}/${file}`
        if (fs.statSync(currentPath).isDirectory()) {
          remove(currentPath)
        } else {
          fs.unlinkSync(currentPath)
        }
      })
      fs.rmdirSync(path)
    }
  }

  remove(localPath)
  succeed('删除本地打包目录成功')
}

// 删除本地打包zip文件
const removeLocalFile = (config, index) => {
  const localPath = `${process.cwd()}/${config.distPath}`

  log(`(${index}) 删除本地打包zip文件 ${localPath}.zip`)

  fs.unlinkSync(`${localPath}.zip`)
  succeed('删除本地打包zip文件')
}

// 断开ssh
const disconnectSSH = () => {
  ssh.dispose()
}

// 创建任务列表
const createTaskList = (config) => {

  taskList = []

  config.script && taskList.push(execBuild)
  server.uploadCommand || taskList.push(buildZip)

  config.servers.forEach(server => {
    taskList.push(connectSSH(server))
    server.uploadCommand && taskList.push(runLocalCommand('上传文件', server.uploadCommand));
    server.uploadCommand || taskList.push(uploadLocalFile(server));
    server.remoteBeforeCommand && taskList.push(runBeforeRemoteCommand(server));
    server.isRemoveRemoteFile && taskList.push(removeRemoteFile(server))
    server.uploadCommand || taskList.push(unzipRemoteFile(server));
    server.remoteAfterCommand && taskList.push(runAfterRemoteCommand(server));
    taskList.push(disconnectSSH)
  })
  config.script && taskList.push(removeLocalBuildFile)
  config.script && taskList.push(removeLocalFile)
}

// 执行任务列表
const executeTaskList = async (config) => {
  for (const [index, execute] of new Map(
    taskList.map((execute, index) => [index, execute])
  )) {
    await execute(config, index + 1)
  }
}

module.exports = {
  description: '部署项目',
  apply: async (env) => {
    if (checkDeployConfigExists()) {
      const config = require(deployConfigPath)
      const projectName = config.projectName

      const envConfig = Object.assign(config[env], {
        privateKey: config.privateKey,
        passphrase: config.passphrase
      })

      checkEnvCorrect(envConfig, env)

      const answers = await confirmDeploy(
        `${underline(projectName)} 项目是否部署到 ${underline(envConfig.name)}?`
      )

      if (answers.confirm) {
        createTaskList(envConfig)

        await executeTaskList(envConfig)

        succeed(
          `恭喜您，${underline(projectName)}项目已在${underline(
            envConfig.name
          )}部署成功\n`
        )
        process.exit(0)
      } else {
        process.exit(1)
      }
    } else {
      error(
        'deploy.config.js 文件不存，请使用 deploy-cli-service init 命令创建'
      )
      process.exit(1)
    }
  }
}
