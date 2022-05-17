#!/usr/bin/env node
// vim: set ft=javascript:

import path from 'path'
import runMigrations from 'migrate/lib/migrate'
import log from 'migrate/lib/log'
import load from '../../lib/load'
import yargs from 'yargs'
import { LoadArgs } from '../../lib/load'

export const command = 'down [file]'

export const desc =
  'Migrate down to a given migration or just the last one if not specified'

export const builder = (yargs: yargs.Argv) => {
  yargs
    .option('access-token', {
      alias: 't',
      describe:
        'Contentful Management API access token',
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      defaultDescription: 'environment var CONTENTFUL_MANAGEMENT_ACCESS_TOKEN'
    })
    .option('space-id', {
      alias: 's',
      describe: 'space id to use',
      type: 'string',
      requiresArg: true,
      demandOption: true,
      default: process.env.CONTENTFUL_SPACE_ID,
      defaultDescription: 'environment var CONTENTFUL_SPACE_ID'
    })
    .option('environment-id', {
      alias: 'e',
      describe: 'id of the environment within the space',
      type: 'string',
      requiresArg: true,
      default: process.env.CONTENTFUL_ENV_ID || 'master',
      defaultDescription: 'environment var CONTENTFUL_ENV_ID if exists, otherwise master'
    })
    .option('dry-run', {
      alias: 'd',
      describe: 'only shows the planned actions, don\'t write anything to Contentful',
      boolean: true,
      default: false
    })
    .positional('file', {
      describe: 'If specified, rollback all migrations scripts down to this one.',
      type: 'string'
    })
}

export const handler = async (args: LoadArgs & { file: string }) => {
  const {
    accessToken,
    dryRun,
    environmentId,
    file,
    spaceId
  } = args

  const migrationsDirectory = process.env.CONTENTFUL_MIGRATIONS_DIR || path.join('.', 'migrations')

  // Load in migrations
  const set = await load({
    migrationsDirectory, spaceId, environmentId, accessToken, dryRun
  })
  const name = (file) || set.lastRun
  runMigrations(set, 'down', name!, (error) => {
    if (error) {
      log('error', error)
      process.exit(1)
    }

    log('migration', 'complete')
    process.exit(0)
  })
}
