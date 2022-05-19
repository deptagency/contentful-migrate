#!/usr/bin/env node
// vim: set ft=javascript:

import chalk from 'chalk'
import readline from 'readline'
import path from 'path'
import yargs from 'yargs'
import bootstrap from '../../lib/bootstrap'
import { Args, checkAccessToken } from '../../lib/client'
import { generateTypedefs } from '../../lib/download-schema'

export const command = 'bootstrap'

export const desc =
  'Takes a snapshot of existing space and automatically generate migration scripts'

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
    .option('write-typedefs', {
      describe: 'path where generated type definitions should be written',
      type: 'string',
      requiresArg: false,
    })
}

const isYes = (response: string) => response === 'y' || response === 'yes'

export const handler = async ({
  environmentId,
  spaceId,
  accessToken,
  writeTypedefs
}: Args & { writeTypedefs?: string }) => {
  checkAccessToken(accessToken);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  const asyncQuestion = (question: string) => {
    return new Promise<string>((resolve) => {
      rl.question(question, (response: string) => {
        resolve(response)
      })
    })
  }

  const migrationsDirectory = process.env.CONTENTFUL_MIGRATIONS_DIR || path.join('.', 'migrations')
  let writeMigrationState = false
  const answer = await asyncQuestion(chalk.bold.yellow('⚠️   Do you want to generate initial migration state for ALL content types? y/N: '))
  if (isYes(answer)) {
    console.log(chalk.bold.red('🚨  What you are about to do is destructive!'))
    console.log(chalk.bold.red(`    It will mutate all migration state for every content type in space ${spaceId}`))
    const confirmation = await asyncQuestion(chalk.bold.yellow('⚠️   Are you sure you want to proceed? y/N: '))
    writeMigrationState = isYes(confirmation)
  }
  rl.close()
  await bootstrap(spaceId, environmentId, accessToken, migrationsDirectory, writeMigrationState)
  if (writeTypedefs) {
    console.log('regenerating type definitions');
    await generateTypedefs({ accessToken, environmentId, spaceId, writeTypedefs });
    console.log('complete');
}
}
