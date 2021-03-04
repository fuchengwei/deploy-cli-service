const fs = require('fs')
const os = require('os')
const path = require('path')

const devConfig = [
  {
    type: 'input',
    name: 'devName',
    message: '环境名称',
    default: '开发环境',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devScript',
    message: '打包命令',
    default: 'npm run build:dev',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devHost',
    message: '服务器地址',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'number',
    name: 'devPort',
    message: '服务器端口号',
    default: 22,
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devUsername',
    message: '用户名',
    default: 'root',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'password',
    name: 'devPassword',
    message: '密码',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devDistPath',
    message: '本地打包目录',
    default: 'dist',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devWebDir',
    message: '部署路径',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'input',
    name: 'devBakDir',
    message: '备份路径',
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'confirm',
    name: 'devIsRemoveRemoteFile',
    message: '是否删除远程文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('dev')
  },
  {
    type: 'confirm',
    name: 'devIsRemoveLocalFile',
    message: '是否删除本地打包文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('dev')
  }
]

const testConfig = [
  {
    type: 'input',
    name: 'testName',
    message: '环境名称',
    default: '测试环境',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testScript',
    message: '打包命令',
    default: 'npm run build:test',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testHost',
    message: '服务器地址',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'number',
    name: 'testPort',
    message: '服务器端口号',
    default: 22,
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testUsername',
    message: '用户名',
    default: 'root',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'password',
    name: 'testPassword',
    message: '密码',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testDistPath',
    message: '本地打包目录',
    default: 'dist',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testWebDir',
    message: '部署路径',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'input',
    name: 'testBakDir',
    message: '备份路径',
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'confirm',
    name: 'testIsRemoveRemoteFile',
    message: '是否删除远程文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('test')
  },
  {
    type: 'confirm',
    name: 'testIsRemoveLocalFile',
    message: '是否删除本地打包文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('test')
  }
]

const prodConfig = [
  {
    type: 'input',
    name: 'prodName',
    message: '环境名称',
    default: '生产环境',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodScript',
    message: '打包命令',
    default: 'npm run build:prod',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodHost',
    message: '服务器地址',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'number',
    name: 'prodPort',
    message: '服务器端口号',
    default: 22,
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodUsername',
    message: '用户名',
    default: 'root',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'password',
    name: 'prodPassword',
    message: '密码',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodDistPath',
    message: '本地打包目录',
    default: 'dist',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodWebDir',
    message: '部署路径',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'input',
    name: 'prodBakDir',
    message: '备份路径',
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'confirm',
    name: 'prodIsRemoveRemoteFile',
    message: '是否删除远程文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('prod')
  },
  {
    type: 'confirm',
    name: 'prodIsRemoveLocalFile',
    message: '是否删除本地打包文件',
    default: true,
    when: (answers) => answers.deployEnvList.includes('prod')
  }
]

module.exports = {
  packageInfo: require('../../package.json'),
  deployConfigPath: `${path.join(process.cwd())}/deploy.config.js`,
  inquirerConfig: [
    {
      type: 'input',
      name: 'projectName',
      message: '请输入项目名称',
      default: fs.existsSync(`${path.join(process.cwd())}/package.json`)
        ? require(`${process.cwd()}/package.json`).name
        : ''
    },
    {
      type: 'input',
      name: 'privateKey',
      message: '请输入本地私钥地址',
      default: `${os.homedir()}/.ssh/id_rsa`
    },
    {
      type: 'password',
      name: 'passphrase',
      message: '请输入本地私钥密码',
      default: ''
    },
    {
      type: 'checkbox',
      name: 'deployEnvList',
      message: '请选择需要部署的环境',
      choices: [
        {
          name: 'dev',
          checked: true
        },
        {
          name: 'test'
        },
        {
          name: 'prod'
        }
      ]
    },
    ...devConfig,
    ...testConfig,
    ...prodConfig
  ]
}
