#!/usr/bin/env node
// vim: set ft=javascript:

import path from 'path'
import chalk from 'chalk'
import log from 'migrate/lib/log'
import generator from 'migrate/lib/template-generator'
import yargs from 'yargs'

exports.command = 'create <name>'

exports.desc =
  'Creates an empty time stamped file in the content-type\'s migrations folder'

exports.builder = (yargs: yargs.Argv) => {
  yargs
    .positional('name', {
      describe: 'descriptive name for the migration file',
      type: 'string'
    })
}

exports.handler = ({ name }: { name: string }) => {
  const migrationsDirectory = (
    process.env.CONTENTFUL_MIGRATIONS_DIR ||
    path.join('.', 'migrations'))

  const templateFile = path.join(__dirname, '..', '..', 'lib', 'template.js')

  generator({
    name,
    templateFile,
    migrationsDirectory,
    dateFormat: 'UTC:yyyymmddHHMMss',
    extension: '.js'
  }, (error, filename) => {
    if (error) {
      log(chalk.bold.red(`🚨 Template generation error ${error.message}`), '')
      process.exit(1)
    }
    log('🎉 created', filename)
  })
}
