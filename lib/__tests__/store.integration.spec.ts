/* eslint-disable @typescript-eslint/no-non-null-assertion */
import contentful, { createClient, CreateContentTypeProps, Environment } from 'contentful-management'
import { MigrationState } from '../store'
import dateformat from 'dateformat'
import expect from 'expect.js'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { exec as exec_ } from 'child_process'
import mkdirp from 'mkdirp'
const exec = promisify(exec_);

const accessToken = process.env.CONTENTFUL_INTEGRATION_MANAGEMENT_TOKEN
const spaceId = process.env.CONTENTFUL_INTEGRATION_SOURCE_SPACE
const environmentId = `test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`

const TIME_OUT = 30000 // in milliseconds
const NODE_CMD = 'node'
const MIGRATION_CMD = 'dist/bin/ctf-migrate'
const MIGRATIONS_FOLDER = path.join(process.cwd(), 'migrations')
const TOKEN_SPACE_ENV_OPTIONS: string[] = ['-t', accessToken!, '-s', spaceId!, '-e', environmentId]

if (!accessToken) {
  throw new Error('Missing CONTENTFUL_INTEGRATION_MANAGEMENT_TOKEN in ENV!')
}

if (!spaceId) {
  throw new Error('Missing CONTENTFUL_INTEGRATION_SOURCE_SPACE in ENV!')
}

const client = createClient({ accessToken })

let defaultLocale: string;
let environment: contentful.Environment;

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

async function createTestEnvironment(
  environmentId: string
): Promise<{ environment: Environment, defaultLocale: string }> {
  const space = await client.getSpace(spaceId!)
  const env = await space.createEnvironmentWithId(environmentId, { name: environmentId })
  let defaultLocale: string | null= null;
  while (!defaultLocale) {
    try {
      defaultLocale = await env.getLocales()
        .then(response => response.items.find(locale => locale.default))
        .then(locale => locale!.code)
    } catch (e) {
      await sleep(100);
      console.log('Environment not created yet. Retrying')
    }
  }
  return { environment: env, defaultLocale };
}
async function getMigrationState(env: Environment): Promise<MigrationState>;
async function getMigrationState(env: Environment, options: { default: null }): Promise<MigrationState | null>;
async function getMigrationState(env: Environment, options?: { default: null }): Promise<MigrationState | null> {
  const entries = await env.getEntries({ content_type: 'migration' })
  if (entries.items.length === 0) {
    if (options) return options.default;
    return null;
  }
  return entries.items[0].fields.state[defaultLocale];
}

async function deleteTestEnvironment (this: Mocha.Context) {
  this.timeout(TIME_OUT)
  await mkdirp(MIGRATIONS_FOLDER)
  await exec(`rm -r ${MIGRATIONS_FOLDER}`)
  return environment && environment.delete()
}

const nameField = {
  id: 'name',
  name: 'Name',
  type: 'Text',
  required: false,
  localized: false,
};

describe('Integration Test @integration', () => {
  before(async function (this: Mocha.Context) {
    this.timeout(TIME_OUT);
    const ret = await createTestEnvironment(environmentId);
    environment = ret.environment;
    defaultLocale = ret.defaultLocale;
  })

  after(deleteTestEnvironment)

  describe('init command', () => {
    it('should create the migration content model', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} init ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);
      const migration = await environment.getContentType('migration')
      const { name, displayField, fields } = migration!
      expect(name).to.be('Migration')
      expect(displayField).to.be('contentTypeId')
      expect(fields).to.have.length(2)
      const [state, contentTypeId] = fields
      expect(state.type).to.be('Object')
      expect(contentTypeId.type).to.be('Symbol')
    }).timeout(TIME_OUT)
  })

  describe('create command', () => {
    it('should create a template file in migrations folder', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} create create-horse`);
      const migrationScripts = fs.readdirSync(MIGRATIONS_FOLDER)
      expect(migrationScripts).to.have.length(1)
      expect(migrationScripts[0]).to.match(/\d{14}-create-horse.js/)
    }).timeout(TIME_OUT)
  })

  describe('up command', () => {
    it('-d option should not apply migration', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} up -d ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      const state = await getMigrationState(environment, { default: null });
      expect(state).to.be(null);
    }).timeout(TIME_OUT)

    it('should apply migration', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} up ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      const state = await getMigrationState(environment);
      const scriptsRan = state.migrations.map(migration => migration.title)
      expect(scriptsRan).to.have.length(1)

      const migrationScripts = fs.readdirSync(MIGRATIONS_FOLDER)
      expect(migrationScripts).to.eql(scriptsRan)
    }).timeout(30000)

    it('up without new script should not change last run', async () => {
      const previousMigration = await getMigrationState(environment);

      await exec(`${NODE_CMD} ${MIGRATION_CMD} up ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      const state = await getMigrationState(environment);

      expect(state).to.eql(previousMigration);

      const migrationScripts = fs.readdirSync(MIGRATIONS_FOLDER)
      expect(migrationScripts.length).to.eql(state.migrations.length)
    }).timeout(30000)

    it('should run all content types not migrated', async () => {
      // create script for different content type
      await exec(`${NODE_CMD} ${MIGRATION_CMD} create create-alpaca`);

      await exec(`${NODE_CMD} ${MIGRATION_CMD} up ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      const state = await getMigrationState(environment);
      expect(state.migrations).to.have.length(2)
    }).timeout(30000)
  })

  describe('down command', () => {
    it('should apply down for the last migration in specified contentType', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} down ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);


      const state = await getMigrationState(environment);

      expect(state.migrations).to.have.length(1)
    }).timeout(30000)

    it('-d option should not apply down migration', async () => {
      await exec(`${NODE_CMD} ${MIGRATION_CMD} down -d ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);


      const state = await getMigrationState(environment);

      expect(state.migrations).to.have.length(1)
    }).timeout(30000)
  })

  describe('bootstrap command', () => {
    beforeEach(async () => {
      // delete migrations folder to set up for these set of tests
      await mkdirp(MIGRATIONS_FOLDER);
      await exec(`rm -r ${MIGRATIONS_FOLDER}`);
    })

    it('creates scripts for all content types', async () => {
      const contentTypeNames = ['Alpaca', 'Horse'];
      await Promise.all(contentTypeNames.map(async (name) => {
        const contentType = { name, fields: [nameField] };
        const createdContentType = await environment.createContentTypeWithId(name.toLowerCase(), contentType);
        await createdContentType.publish();
      }));

      await exec(`yes no | ${MIGRATION_CMD} bootstrap ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`)

      const contentTypes = fs.readdirSync(MIGRATIONS_FOLDER)
      expect(contentTypes).to.have.length(2)
    }).timeout(30000)


    it('option with yes overrides the state for all content type', async () => {
      await exec(`yes | ${MIGRATION_CMD} bootstrap ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      const state = await  getMigrationState(environment);
      const scriptsRan = state.migrations.map(migration => migration.title)
      expect(scriptsRan).to.have.length(2)

      const migrationScripts = fs.readdirSync(MIGRATIONS_FOLDER)
      expect(migrationScripts.sort()).to.eql(scriptsRan.sort())
    }).timeout(30000)

    it('copes with circular references in content models', async () => {
      const post: CreateContentTypeProps = {
        name: 'post', fields: [nameField, {
        id: 'heroLink',
        name: 'heroLink',
        type: 'Link',
        required: false,
        localized: false,
        validations: [
          {"linkContentType":["hero"]}
        ],
        linkType: "Entry"
      }] };
      await environment.createContentTypeWithId(post.name, post).then(ct => ct.publish());
      const hero: CreateContentTypeProps = {
        name: 'hero', fields: [nameField, {
        id: 'postLink',
        name: 'postLink',
        type: 'Link',
        required: true,
        localized: false,
        validations: [
          {"linkContentType":["post"]}
        ],
        linkType: "Entry"
      }] };
      await environment.createContentTypeWithId(hero.name, hero).then(ct => ct.publish());
      await exec(`yes | ${MIGRATION_CMD} bootstrap ${TOKEN_SPACE_ENV_OPTIONS.join(' ')}`);

      // and the resulting migrations can be applied without error
      const bootstrapEnvId = `bootstrap-test-${dateformat(new Date(), 'UTC:yyyymmddHHMMss')}`;
      const { environment: bootstrapEnv } = await createTestEnvironment(bootstrapEnvId);

      try {
        await exec(`${MIGRATION_CMD} init -t ${accessToken} -s ${spaceId} -e ${bootstrapEnvId}`);
        await exec(`${MIGRATION_CMD} up -t ${accessToken} -s ${spaceId} -e ${bootstrapEnvId}`);

        const ctypes = await bootstrapEnv.getContentTypes();
        const contentTypeNames = ctypes.items.map(t => t.name)
        expect(contentTypeNames).to.contain('post');
        expect(contentTypeNames).to.contain('hero');
      } finally {
        await bootstrapEnv.delete();
      }
    }).timeout(TIME_OUT);

  })
})
