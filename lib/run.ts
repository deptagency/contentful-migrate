// TODO: Contribute a `dry-run` option to contentful-migration's `run` and use
// the it instead of this messy version. This code was adapted from the transpiled version of
// https://github.com/contentful/migration-cli/blob/master/src/bin/cli.ts

/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */

import path from 'path'

import Listr from 'listr'
import chalk from 'chalk'
import { createManagementClient } from 'contentful-migration/built/bin/lib/contentful-client'
import { SpaceAccessError } from 'contentful-migration/built/lib/errors'
import createMigrationParser from 'contentful-migration/built/lib/migration-parser'
import renderMigration from 'contentful-migration/built/bin/lib/render-migration'
import stepsError from 'contentful-migration/built/bin/lib/steps-errors'
import writeErrorsToLog from 'contentful-migration/built/bin/lib/write-errors-to-log'
import { createMakeRequest } from 'contentful-migration/built/bin/cli'
import { version } from '../package.json'

class BatchError extends Error {
  public batch: any;
  public errors: any[];
  constructor (message: string, batch: any, errors: any[]) {
    super(message)
    this.batch = batch
    this.errors = errors
  }
}

export interface RunArgs {
  spaceId: string,
  environmentId: string,
  accessToken: string,
  dryRun: boolean,
  migrationFunction: (args: any) => any
}
const run = async ({
  spaceId, environmentId, accessToken, dryRun, migrationFunction
}: RunArgs) => {
  const config = { spaceId, environmentId, accessToken }
  if (!/^CFPAT-/.test(accessToken)) {
    console.log("error: access token not set or did not match pattern. Make sure you're using a personal access token")
    process.exit(1)
  }

  const clientConfig = Object.assign({
    application: `contentful-migrate/${version}`
  }, config)
  const client = createManagementClient(clientConfig)

  const makeRequest = createMakeRequest(client, {
    spaceId: config.spaceId,
    environmentId: config.environmentId
  })
  const migrationParser = createMigrationParser(makeRequest, clientConfig)
  let parseResult
  try {
    parseResult = await migrationParser(migrationFunction)
  } catch (e) {
    if (e instanceof SpaceAccessError) {
      const message = [
        chalk.red.bold(`${e.message}\n`),
        chalk.red.bold('🚨  Migration unsuccessful')
      ].join('\n')
      console.log(message)
      process.exit(1)
    }
    console.log(e)
    process.exit(1)
  }
  if (parseResult.hasStepsValidationErrors()) {
    stepsError(parseResult.stepsValidationErrors)
    process.exit(1)
  }
  if (parseResult.hasPayloadValidationErrors()) {
    stepsError(parseResult.payloadValidationErrors)
    process.exit(1)
  }
  // const migrationName = path.basename(argv.filePath, '.js');
  // const errorsFile = path.join(process.cwd(), `errors-${migrationName}-${Date.now()}.log`);
  const errorsFile = path.join(process.cwd(), `errors-${Date.now()}.log`)
  const { batches } = parseResult
  if (parseResult.hasValidationErrors()) {
    renderMigration.renderValidationErrors(batches, environmentId)
    process.exit(1)
  }
  if (parseResult.hasRuntimeErrors()) {
    renderMigration.renderRuntimeErrors(batches, errorsFile)
    await writeErrorsToLog(parseResult.getRuntimeErrors(), errorsFile)
    process.exit(1)
  }
  await renderMigration.renderPlan(batches, environmentId)
  const serverErrorsWritten: Promise<void>[] = []
  const tasks = batches.map((batch) => {
    return {
      title: batch.intent.toPlanMessage().heading,
      task: () => new Listr([
        {
          title: 'Making requests',
          task: async (_ctx, task) => {
            // TODO: We wanted to make this an async interator
            // So we should not inspect the length but have a property for that
            const numRequests = batch.requests.length
            const requestErrors: Error[] = []
            let requestsDone = 0
            for (const request of batch.requests) {
              requestsDone += 1

              /* eslint-disable no-param-reassign */
              task.title = `Making requests (${requestsDone}/${numRequests})`
              task.output = `${request.method} ${request.url} at V${request.headers['X-Contentful-Version']}`
              /* eslint-enable no-param-reassign */

              await makeRequest(request).catch((error) => {
                serverErrorsWritten.push(writeErrorsToLog(error, errorsFile))
                const parsed = JSON.parse(error.message)
                const errorMessage = {
                  status: parsed.statusText,
                  message: parsed.message,
                  details: parsed.details,
                  url: parsed.request.url
                }
                requestErrors.push(new Error(JSON.stringify(errorMessage)))
              })
            }
            // Finish batch and only then throw all errors in there
            if (requestErrors.length) {
              throw new BatchError('Batch failed', batch, requestErrors)
            }
          }
        }
      ])
    }
  })
  if (!dryRun) {
    try {
      const successfulMigration = await (new Listr(tasks)).run()
      console.log(chalk.bold.green('🎉  Migration successful'))
      return successfulMigration
    } catch (err: any) {
      console.log(chalk.bold.red('🚨  Migration unsuccessful: '))
      console.log(chalk.red(`${err.message}\n`))
      err.errors.forEach((error: any) => console.log(chalk.red(`${error}\n\n`)))
      await Promise.all(serverErrorsWritten)
      console.log(`Please check the errors log for more details: ${errorsFile}`)
      throw err
    }
  }
  return console.log(chalk.bold.yellow('⚠️  Dry run completed'))
}

export default function(args: RunArgs & { next(err?: any): void }) {
  return run(args)
    .then(() => args.next())
    .catch(err => args.next(err))
}
