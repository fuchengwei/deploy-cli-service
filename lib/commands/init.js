const fs = require('fs')
const childProcess = require('child_process')
const inquirer = require('inquirer')
const { checkDeployConfigExists, succeed, error } = require('../utils')
const { inquirerConfig, deployConfigPath } = require('../config')

// 获取用户输入信息
const getUserInputInfo = () => {
  return inquirer.prompt(inquirerConfig)
}

// 创建JSON对象
const createJsonObj = (userInputInfo) => {
  const jsonObj = {
    projectName: userInputInfo.projectName
  }
  const { deployEnvList } = userInputInfo

  const createObj = (env) => {
    return {
      name: userInputInfo[`${env}Name`],
      script: userInputInfo[`${env}Script`],
      host: userInputInfo[`${env}Host`],
      port: userInputInfo[`${env}Port`],
      username: userInputInfo[`${env}Username`],
      password: userInputInfo[`${env}Password`],
      distPath: userInputInfo[`${env}DistPath`],
      webDir: userInputInfo[`${env}WebDir`]
    }
  }

  deployEnvList.forEach((item) => (jsonObj[item] = createObj(item)))

  return jsonObj
}

// 创建配置文件
const createConfigFile = (jsonObj) => {
  const str = `module.exports = ${JSON.stringify(jsonObj, null, 2)}`
  fs.writeFileSync(deployConfigPath, str)
}

// 格式化配置文件
const formatConfigFile = () => {
  childProcess.execSync(`npx prettier --write ${deployConfigPath}`)
}

module.exports = {
  description: '初始化项目',
  apply: () => {
    if (checkDeployConfigExists()) {
      error('deploy.config.js 配置文件已存在')
      process.exit(1)
    } else {
      getUserInputInfo().then((userInputInfo) => {
        createConfigFile(createJsonObj(userInputInfo))
        formatConfigFile()
        succeed('配置文件生成成功')
        process.exit(0)
      })
    }
  }
}
