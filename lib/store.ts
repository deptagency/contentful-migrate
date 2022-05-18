import contentful, { createClient } from 'contentful-management'
import type Migration from 'contentful-migration'
import run from './run'

const contentTypeId = 'single';
const queryParams = {
  'fields.contentTypeId': contentTypeId,
  content_type: 'migration',
  limit: 1000
}

export interface MigrationState {
  lastRun: string | null;
  migrations: {
    title: string;
    timestamp: string | Date | number | null;
    description: string;
  }[];
}

export interface Args {
  accessToken: string;
  spaceId: string;
  environmentId: string;
}
const defaultSpaceLocale: string | null = null;
const getDefaultLocale = async ({ accessToken, spaceId, environmentId }: Args): Promise<string> => {
  if (defaultSpaceLocale) return defaultSpaceLocale;
  const client = createClient({ accessToken })
  const loc = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getLocales())
    .then(response => response.items.find(l => l.default))
  if (!loc) return 'en-US'; // 🤞
  return loc.code
}

export function initSpace({ accessToken, spaceId, environmentId }: Args): Promise<void> {
  return new Promise(res => {
    const migrationFunction = (migration: Migration) => {
      const contentType = migration.createContentType('migration')
        .name('Migration')
        .displayField('contentTypeId')
        .description('Meta data to store the state of content model through migrations')

      contentType.createField('state')
        .name('Migration State')
        .type('Object')
        .required(true)

      contentType.createField('contentTypeId')
        .name('Content Type ID')
        .type('Symbol')
        .required(true)
        .validations([{ unique: true }])
    }
    const args = {
      spaceId,
      environmentId: environmentId || 'master',
      accessToken,
      dryRun: false,
      migrationFunction,
      next: res
    }
    return run(args)
  });
}

let cachedState: MigrationState | null;
async function getStoreState (args: Args): Promise<MigrationState | null> {
  const { accessToken, spaceId, environmentId } = args;
  if (typeof cachedState !== 'undefined') {
    return cachedState
  }

  const client = createClient({ accessToken })
  const entries = await client.getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
    .then(space => space.getEntries(queryParams));
  if (entries.items[0]) {
    cachedState = entries.items[0].fields.state[await getDefaultLocale(args)];
  } else {
    cachedState = null;
  }
  return cachedState;
}

export interface ContentfulStoreArgs extends Args {
  dryRun: boolean;
  locale: string;
}
export class ContentfulStore {
  public spaceId: string;
  public environmentId: string;
  public accessToken: string;
  public dryRun: boolean;
  public locale: string;
  public client: contentful.ClientAPI;
  constructor ({
    spaceId, environmentId, accessToken, dryRun, locale
  }: ContentfulStoreArgs) {
    this.spaceId = spaceId
    this.environmentId = environmentId
    this.accessToken = accessToken
    this.dryRun = dryRun
    this.client = createClient({ accessToken })
    this.locale = locale
    return this
  }

  createStateFrom (set: MigrationState) {
    const migrations = set.migrations.filter(m => m.timestamp)
    return {
      [this.locale]: {
        lastRun: set.lastRun,
        migrations: migrations
      }
    }
  }

  isSetEmpty (set: MigrationState) {
    return set.migrations.filter(m => m.timestamp).length === 0
  }

  deleteState () {
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then((space) => space.getEntry(contentTypeId))
      .then((entry) => entry.delete())
  }

  writeState (set: MigrationState) {
    if (this.isSetEmpty(set)) {
      return this.deleteState()
    }
    return this.client.getSpace(this.spaceId)
      .then(space => space.getEnvironment(this.environmentId))
      .then(space => space.getEntries(queryParams))
      .then((entries) => {
        if (entries.total === 0) {
          return this.client.getSpace(this.spaceId)
            .then(space => space.getEnvironment(this.environmentId))
            .then(space => space.createEntryWithId('migration', contentTypeId, {
              fields: {
                contentTypeId: { [this.locale]: contentTypeId },
                state: this.createStateFrom(set)
              }
            }))
        }
        const entry = entries.items[0]
        entry.fields.state = this.createStateFrom(set)
        return entry.update()
      })
  }

  save (set: MigrationState, fn: (error?: any) => void): void {
    if (this.dryRun) {
      return fn()
    }
    this.writeState(set)
      .then(() => fn())
      .catch(error => fn(error))
  }

  get args(): Args {
    return { accessToken: this.accessToken, spaceId:  this.spaceId, environmentId: this.environmentId};
  }

  load (fn: (error: any, state: MigrationState) => any): void {
    getStoreState(this.args)
      .then(state => fn(null, (state || {}) as any));
  }

  init () {
    return initSpace(this.args)
  }
}

interface CreateStoreArgs extends Args {
  dryRun: boolean;
}
export async function createStore(args: CreateStoreArgs) {
  await getStoreState(args)
  const locale = await getDefaultLocale(args);
  return new ContentfulStore({ ...args, locale })
}
