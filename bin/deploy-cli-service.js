#!/usr/bin/env node

const Service = require('../lib/service')
const service = new Service()

const rawArgv = process.argv.slice(2)
const args = require('minimist')(rawArgv)
const command = args._[0]

service.run(command, args, rawArgv)
