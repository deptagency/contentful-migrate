#!/usr/bin/env node
// vim: set ft=javascript:

import path from 'path'
import chalk from 'chalk'
import log from 'migrate/lib/log'
import generator from 'migrate/lib/template-generator'
import yargs from 'yargs'
import mkdirp from 'mkdirp'

export const command = 'create <name>'

export const desc =
  'Creates an empty time stamped file in the content-type\'s migrations folder'

export const builder = (yargs: yargs.Argv) => {
  yargs
    .positional('name', {
      describe: 'descriptive name for the migration file',
      type: 'string'
    })
}

export const handler = async ({ name }: { name: string }) => {
  const migrationsDirectory = (
    process.env.CONTENTFUL_MIGRATIONS_DIR ||
    path.join('.', 'migrations'))
  await mkdirp(migrationsDirectory);

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
