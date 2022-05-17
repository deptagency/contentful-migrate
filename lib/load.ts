import { promisify } from 'util'
import log from 'migrate/lib/log'
import { RunArgs } from './run'
import { MigrationSet, load as migrateLoad } from 'migrate'
import { createStore } from '../lib/store'
import run from '../lib/run'

const loadAsync = promisify(migrateLoad)

const runWrapper = (args: RunArgs) => {
  return (next: () => void) => {
    const argsWithNext = Object.assign({}, args, { next })
    run(argsWithNext)
  }
}

function configureSet(set: MigrationSet, spaceId: string, environmentId: string, accessToken: string, dryRun: boolean) {
  set.migrations.forEach((migration) => {
    /* eslint-disable no-param-reassign */
    if (migration.up) {
      const migrationFunction = migration.up
      migration.up = runWrapper({
        migrationFunction, spaceId, environmentId, accessToken, dryRun
      })
    }
    if (migration.down) {
      const migrationFunction = migration.down
      migration.down = runWrapper({
        migrationFunction, spaceId, environmentId, accessToken, dryRun
      })
    }
    /* eslint-enable no-param-reassign */
  })

  set.on('warning', (msg) => {
    log('warning', msg)
  })

  set.on('migration', (migration, direction) => {
    log(direction, migration.title)
  })

  return set
}

export interface LoadArgs {
  spaceId: string;
  environmentId: string;
  accessToken: string;
  dryRun: boolean;
  migrationsDirectory: string;
}
export default async function load({
  migrationsDirectory,
  spaceId,
  environmentId,
  accessToken,
  dryRun,
}: LoadArgs): Promise<MigrationSet> {
  const store = await createStore({
    accessToken,
    dryRun,
    environmentId,
    spaceId
  })

  return loadAsync({ stateStore: store, migrationsDirectory })
    .then((set: MigrationSet) => configureSet(set, spaceId, environmentId, accessToken, dryRun))
}
