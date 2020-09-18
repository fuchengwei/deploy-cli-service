const fs = require('fs')
const ora = require('ora')
const inquirer = require('inquirer')
const { NodeSSH } = require('node-ssh')
const childProcess = require('child_process')
const { deployConfigPath } = require('../config')
const {
  checkDeployConfigExists,
  log,
  succeed,
  error,
  underline,
} = require('../utils')

const ssh = new NodeSSH()

// 是否确认部署
const confirmDeploy = (message) => {
  return inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message,
    },
  ])
}

// 检查环境是否正确
const checkEnvCorrect = (config, env) => {
  const keys = [
    'name',
    'script',
    'host',
    'port',
    'username',
    'password',
    'distPath',
    'webDir',
  ]

  if (config) {
    keys.forEach((key) => {
      if (!config[key] || config[key] === '/') {
        error(
          `${underline(`${env}环境`)} ${underline(`${key}属性`)} 配置不正确`
        )
        process.exit(1)
      }
    })
  } else {
    error(`未指定部署环境或指定部署环境不存在`)
    process.exit(1)
  }
}

// 执行打包脚本
const execBuild = async (script) => {
  try {
    log(`(1) ${script}`)
    const spinner = ora('正在打包中\n')

    spinner.start()

    await new Promise((resolve, reject) => {
      childProcess.exec(script, { cwd: process.cwd() }, (e) => {
        spinner.stop()
        if (e === null) {
          succeed('打包成功')
          resolve()
        } else {
          reject(e.message)
        }
      })
    })
  } catch (e) {
    error('打包失败')
    error(e)
    process.exit(1)
  }
}

// 连接ssh
const connectSSH = async (config) => {
  try {
    log(`(2) ssh连接 ${underline(config.host)}`)
    await ssh.connect(config)
    succeed('ssh连接成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 删除远程文件
const removeRemoteFile = async (config) => {
  try {
    const {webDir,preserve}=config
    if (preserve) {
      return  log(`(3) 保留远程文件 ${underline(webDir)}`)
    }
    log(`(3) 删除远程文件 ${underline(webDir)}`)
    await ssh.execCommand(`rm -rf ${webDir}`)
    succeed('删除成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 上传本地文件
const uploadLocalFile = async (config) => {
  try {
    log(`(4) 上传打包文件至目录 ${underline(config.webDir)}`)

    const localPath = `${process.cwd()}/${config.distPath}`
    const spinner = ora('正在上传中\n')

    spinner.start()

    await ssh.putDirectory(localPath, config.webDir, {
      recursive: true,
      concurrency: 10,
    })

    spinner.stop()
    succeed('上传成功')
  } catch (e) {
    error(e)
    process.exit(1)
  }
}

// 断开ssh
const disconnectSSH = () => {
  ssh.dispose()
}

// 删除本地打包文件
const removeLocalFile = (config) => {
  const localPath = `${process.cwd()}/${distPath}`
  const {distPath,preserveLocal}=config
  if (preserveLocal) {
    return log(`(5) 保留本地打包目录 ${underline(localPath)}`)
  }
  log(`(5) 删除本地打包目录 ${underline(localPath)}`)

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

module.exports = {
  description: '部署项目',
  apply: async (env) => {
    if (checkDeployConfigExists()) {
      const config = require(deployConfigPath)
      const projectName = config.projectName
      const envConfig = config[env]
      checkEnvCorrect(envConfig, env)

      const answers = await confirmDeploy(
        `${underline(projectName)} 项目是否部署到 ${underline(envConfig.name)}?`
      )

      if (answers.confirm) {
        await execBuild(envConfig.script)
        await connectSSH(envConfig)

        const webDir =
          Object.prototype.toString.call(envConfig.webDir) === '[object Array]'
            ? envConfig.webDir
            : [envConfig.webDir]
        for (let dir of webDir) {
          envConfig.webDir = dir
          await removeRemoteFile(envConfig)
          await uploadLocalFile(envConfig)
        }

        disconnectSSH()
        removeLocalFile(envConfig.distPath)
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
  },
}
