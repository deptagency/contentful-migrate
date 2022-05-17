#!/usr/bin/env node
// vim: set ft=javascript:
/* eslint-disable no-console */
import runMigrations from 'migrate/lib/migrate'
import type yargs from 'yargs'
import path from 'path'
import { promisify } from 'util'
import chalk from 'chalk'
import log from 'migrate/lib/log'
import load from '../../lib/load'

export const command = 'up [file]'

export const desc =
  'Migrate up to a give migration or all pending if not specified'

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
    .option('content-type', {
      alias: 'c',
      describe: 'one or more content type names to process',
      array: true,
      default: []
    })
    .option('all', {
      alias: 'a',
      describe: 'processes migrations for all content types',
      boolean: true
    })
    .option('dry-run', {
      alias: 'd',
      describe: 'only shows the planned actions, don\'t write anything to Contentful',
      boolean: true,
      default: false
    })
    .positional('file', {
      describe: 'If specified, applies all pending migrations scripts up to this one.',
      type: 'string'
    })
}

const runMigrationsAsync = promisify(runMigrations)

interface Args {
  accessToken: string;
  dryRun: boolean;
  environmentId: string;
  file?: string;
  spaceId: string;
}
export const handler = async (args: Args) => {
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
    accessToken,
    dryRun,
    environmentId,
    migrationsDirectory,
    spaceId
  });
  console.log(chalk.bold.blue('Processing migrations'))
  try {
    await runMigrationsAsync(set, 'up', file!)
    console.log('All migrations applied')
    console.log(chalk.bold.yellow(`\n🎉  All content types in ${environmentId} are up-to-date`))
  } catch (err) {
    log.error('error', err)
    console.log(chalk.bold.red(`\n🚨  Error applying migrations to "${environmentId}" environment! See above for error messages`))
    process.exit(1)
  }
}
