module.exports = {
  projectName: 'test',
  privateKey: '/Users/bin/.ssh/id_rsa',
  passphrase: '',
  dev: {
    name: '开发环境',

    

    port: 22,
    username: 'yoyo',
    password: '123456.Yoyo',
    webDir: '/home/yoyo/temp/deploy',
    remoteBeforeCommand: 'ls',
    remoteAfterCommand: 'echo "remoteAfterCommand"',
    isRemoveRemoteFile: false,
    uploadCommand: 'ls',

    servers: [{
      host: '192.168.16.21',
    }],
    distPath: './bin',
    isRemoveRemoteFile: true
  }
}
