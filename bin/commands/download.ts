#!/usr/bin/env node
// vim: set ft=javascript:
import type yargs from "yargs";
import path from "path"
import chalk from "chalk"
import log from "migrate/lib/log"
import { checkAccessToken } from "../../lib/client";
import downloadSchema, { generateTypedefs } from "../../lib/download-schema";

export const command = "download";

export const desc =
  "Download the current-schema.json and updated typedefs for this environment.";

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
    })
    .option('write-typedefs', {
      describe: 'path where generated type definitions should be written',
      type: 'string',
      requiresArg: false,
    });
};

interface Args {
  spaceId: string;
  environmentId: string;
  accessToken: string;
  writeTypedefs: string;
}
export async function handler (args: Args): Promise<void> {
  checkAccessToken(args.accessToken);
  const migrationsDirectory =
    process.env.CONTENTFUL_MIGRATIONS_DIR || path.join(".", "migrations");


  try {
    console.log(chalk.bold.blue("Downloading Schema and type definitions"));
    // eslint-disable-next-line no-console
    await downloadSchema({ ...args, migrationsDirectory });

    if (args.writeTypedefs) {
      await generateTypedefs(args);
    }

  } catch (err) {
    log.error("error", err);
    process.exit(1);
  }
}
