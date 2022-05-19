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

function configureSet(set: MigrationSet, args: LoadArgs) {
  set.migrations.forEach((migration) => {
    /* eslint-disable no-param-reassign */
    if (migration.up) {
      migration.up = runWrapper({
        ...args, migrationFunction: migration.up,
      })
    }
    if (migration.down) {
      migration.down = runWrapper({
        ...args, migrationFunction: migration.down,
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
export default async function load(args: LoadArgs): Promise<MigrationSet> {
  const store = await createStore(args)

  return loadAsync({
    stateStore: store as any,
    migrationsDirectory: args.migrationsDirectory,
    filterFunction: filename => filename !== 'current-schema.json',
  })
    .then((set: MigrationSet) => configureSet(set, args))
}
