import fs from 'fs'
import type { Args } from "./client";
import contentfulExport from 'contentful-export';
import getClient from "./client";
import render from '@bgschiller/contentful-typescript-codegen/dist/lib/renderers/render'
import mkdirp from 'mkdirp';

export interface DownloadSchemaArgs extends Args {
  migrationsDirectory: string;
}
export default async function downloadSchema(
  { spaceId, environmentId, accessToken, migrationsDirectory }: DownloadSchemaArgs
) {
  await mkdirp(migrationsDirectory);
  return contentfulExport({
    spaceId,
    environmentId,
    managementToken: accessToken,
    exportDir: migrationsDirectory,
    contentFile: 'current-schema.json',
    skipContent: true,
    skipRoles: true,
    skipWebhooks: true,
  });
}

export interface WriteTypedefArgs extends Args {
  writeTypedefs: string;
}
export async function generateTypedefs(args: WriteTypedefArgs) {
  const env = await getClient(args);
  const contentTypes = await env.getContentTypes({ limit: 1000 });
  const locales = await env.getLocales();
  const output = await render(contentTypes.items, locales.items, {
    localization: true
  });
  await fs.promises.writeFile(args.writeTypedefs, output);
}
