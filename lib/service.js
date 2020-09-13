const fs = require('fs')
const program = require('commander')
const { packageInfo } = require('./config')

module.exports = class Service {
  constructor() {
    setupDefaultCommands()

    registerCommands()
  }

  run(_id, _args = {}, rawArgv = []) {
    program.parse(rawArgv, { from: 'user' })
  }
}

// 设置默认命令
const setupDefaultCommands = () => {
  program.version(packageInfo.version, '-v, --version', '输出当前版本号')
  program.helpOption('-h, --help', '获取帮助')
  program.addHelpCommand(false)
}

// 注册命令
const registerCommands = () => {
  const commandsPath = `${__dirname}/commands`

  const idToPlugin = (id) => {
    const command = require(`${commandsPath}/${id}`)
    const commandName = id.split('.')[0]
    const alias = id.charAt(0)

    if (commandName === 'deploy') {
      program
        .command(commandName)
        .description(command.description)
        .alias(alias)
        .option('-m, --mode <mode>', 'setup deploy mode')
        .action((options) => {
          command.apply(options.mode)
        })
    } else {
      program
        .command(commandName)
        .description(command.description)
        .alias(alias)
        .action(() => {
          command.apply()
        })
    }
  }

  fs.readdirSync(`${commandsPath}`).forEach(idToPlugin)
}
