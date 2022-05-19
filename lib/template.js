// @ts-check

/**
 * @type {import("./current-schema").ContentfulSchema}
 */
// @ts-ignore because the explicit types are more correct than TypeScript's guess
const currentSchema = require('./current-schema.json');
// The currentSchema file will be updated prior to each migration run.
module.exports.description = '<Put your description here>'

/**
 * @param {import("contentful-migration").default} migration
 */
module.exports.up = (migration) => {
  // Add your UP migration script here. See examples here:
  // https://github.com/contentful/migration-cli/tree/master/examples
}

/**
 * @param {import("contentful-migration").default} migration
 */
module.exports.down = (migration) => {
  // Add your DOWN migration script here. See examples here:
  // https://github.com/contentful/migration-cli/tree/master/examples
}
