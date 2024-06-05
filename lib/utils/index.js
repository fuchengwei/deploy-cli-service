const fs = require('fs')
const path = require('path')
const ora = require('ora')
const chalk = require('chalk')

module.exports = {
  // 检查部署配置文件是否存在
  checkDeployConfigExists: (path) => {
    return fs.existsSync(path)
  },
  // 获取部署文件名
  getDeployConfigFileName: () => {
    return `deploy.config.${require(`${path.join(process.cwd())}/package.json`).type === 'module' ? 'cjs' : 'js'}`
  },
  // 日志信息
  log: (message) => {
    console.log(message)
  },
  // 成功信息
  succeed: (...message) => {
    ora().succeed(chalk.greenBright.bold(message))
  },
  // 提示信息
  info: (...message) => {
    ora().info(chalk.blueBright.bold(message))
  },
  // 错误信息
  error: (...message) => {
    ora().fail(chalk.redBright.bold(message))
  },
  // 下划线重点信息
  underline: (message) => {
    return chalk.underline.blueBright.bold(message)
  }
}
