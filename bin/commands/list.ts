#!/usr/bin/env node
// vim: set ft=javascript:
import type yargs from "yargs";
import path from "path"
import chalk from "chalk"
import dateFormat from "dateformat"
import log from "migrate/lib/log"
import load from "../../lib/load";

export const command = "list";

export const desc =
  "List all migrations for a given content-type, also indicating whether it was already applied and when";

export const builder = (yargs: yargs.Argv) => {
  yargs
    .option("access-token", {
      alias: "t",
      describe: "Contentful Management API access token",
      demandOption: true,
      default: process.env.CONTENTFUL_MANAGEMENT_ACCESS_TOKEN,
      defaultDescription: "environment var CONTENTFUL_MANAGEMENT_ACCESS_TOKEN",
    })
    .option("space-id", {
      alias: "s",
      describe: "space id to use",
      type: "string",
      requiresArg: true,
      demandOption: true,
      default: process.env.CONTENTFUL_SPACE_ID,
      defaultDescription: "environment var CONTENTFUL_SPACE_ID",
    })
    .option("environment-id", {
      alias: "e",
      describe: "id of the environment within the space",
      type: "string",
      requiresArg: true,
      default: process.env.CONTENTFUL_ENV_ID || "master",
      defaultDescription:
        "environment var CONTENTFUL_ENV_ID if exists, otherwise master",
    });
};

interface Args {
  spaceId: string;
  environmentId: string;
  accessToken: string;
}
export default async function ({
  spaceId,
  environmentId,
  accessToken,
}: Args): Promise<void> {
  const migrationsDirectory =
    process.env.CONTENTFUL_MIGRATIONS_DIR || path.join(".", "migrations");

  // Load in migrations
  const set = await load({
    accessToken,
    dryRun: false,
    environmentId,
    migrationsDirectory,
    spaceId,
  });
  try {
    console.log(chalk.bold.blue("Listing Migrations"));
    // eslint-disable-next-line no-console
    if (set.migrations.length === 0) {
      log("list", "No Migrations");
    } else {
      set.migrations.forEach((migration) => {
        log(
          (migration.timestamp
            ? `[${dateFormat(migration.timestamp, "yyyy-mm-dd HH:mm:ss")}] `
            : chalk.bold.yellow("[pending]             ")) +
            chalk.bold.white(migration.title),
          migration.description || "<No Description>"
        );
      });
    }
  } catch (err) {
    log.error("error", err);
    process.exit(1);
  }
}
