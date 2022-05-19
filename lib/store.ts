import contentful from 'contentful-management'
import path from 'path';
import type Migration from 'contentful-migration'
import getClient, { Args } from './client';
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


const getDefaultLocale = async (environment: contentful.Environment): Promise<string> => {
  const loc = await environment.getLocales().then(ls => ls.items.find(l => l.default));
  if (!loc) return 'en-US'; // 🤞
  return loc.code
}

export async function initSpace(args: Args): Promise<void> {
  const env = await getClient(args);
  try {
    await env.getContentType('migration');
    return; // the content type already exists
  } catch (e) {
    // do nothing, go ahead and create it in the next step.
  }
  const { accessToken, spaceId, environmentId } = args;
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
      next: res,
      migrationsDirectory: process.env.CONTENTFUL_MIGRATIONS_DIR || path.join('.', 'migrations')
    }
    return run(args)
  });
}

export const noEntries = Symbol('no-entries-found');
export const noContentType = Symbol('no-content-type');
export async function getStoreEntry (
  environment: contentful.Environment
): Promise<contentful.Entry | typeof noEntries | typeof noContentType > {
  try {
    const entries = await environment.getEntries(queryParams);
    if (entries.items.length === 0) return noEntries;
    return entries.items[0];
  } catch (e) {
    // migration content type likely doesn't exist.
    return noContentType;
  }
}

export interface ContentfulStoreArgs extends Args {
  dryRun: boolean;
  locale: string;
  environment: contentful.Environment;
}
export class ContentfulStore {
  public dryRun: boolean;
  public locale: string;
  public environment: contentful.Environment;
  public accessToken: string;
  public spaceId: string;
  public environmentId: string;
  constructor ({
    environment, dryRun, locale, accessToken, spaceId, environmentId,
  }: ContentfulStoreArgs) {
    this.dryRun = dryRun
    this.environment = environment;
    this.locale = locale
    this.accessToken = accessToken
    this.spaceId = spaceId
    this.environmentId = environmentId
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
    return this.environment.getEntry(contentTypeId)
      .then((entry) => entry.delete())
  }

  async writeState (set: MigrationState) {
    if (this.isSetEmpty(set)) {
      return this.deleteState()
    }
    return this.environment.getEntries(queryParams)
      .catch(() => {
        throw new Error(`Unable to find migration content type. Do you need to run \`init\` first?`);
      })
      .then((entries) => {
        if (entries.total === 0) {
          return this.environment.createEntryWithId('migration', contentTypeId, {
              fields: {
                contentTypeId: { [this.locale]: contentTypeId },
                state: this.createStateFrom(set)
              }
            })
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

  load (fn: (error: any, state: MigrationState) => any): void {
    getStoreEntry(this.environment)
      .then(entry => {
        if (entry === noContentType) {
          fn(new Error(`Unable to find content type called 'migration'. Do you need to run \`init\` first?`), {} as any);
        } else {
          const state = entry === noEntries ? {} : entry.fields.state[this.locale];
          fn(null, state);
        }
      });
  }

  get args(): Args {
    return { environmentId: this.environmentId, spaceId: this.spaceId, accessToken: this.accessToken };
  }

  init () {
    return initSpace(this.args)
  }
}

interface CreateStoreArgs extends Args {
  dryRun: boolean;
}
export async function createStore(args: CreateStoreArgs) {
  const environment = await getClient(args);
  const locale = await getDefaultLocale(environment);
  return new ContentfulStore({ ...args, locale, environment })
}
