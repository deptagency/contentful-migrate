import path from 'path'
import fs from 'fs'
import log, { error as logError } from 'migrate/lib/log'
import mkdirp from 'mkdirp'
import dateformat from 'dateformat'

const camelToDash = (string: string) => string.replace(/([A-Z])/g, char => `-${char.toLowerCase()}`)

export interface CreatedFile { contentTypeId: string, fileName: string }
export default async function createFile(
  contentTypeId: string, fileContent: string, migrationsDirectory: string
): Promise<CreatedFile> {
  // Ensure migrations directory exists
  await mkdirp(migrationsDirectory).catch(makeDirectoryError => {
    logError(`🚨  Failed to create ${migrationsDirectory}`, makeDirectoryError);
    throw makeDirectoryError;
  })

  // Fix up file path
  const date = dateformat(new Date(), 'UTC:yyyymmddHHMMss')
  const fileName = `${date}-create-${camelToDash(contentTypeId)}.js`
  const filePath = path.join(migrationsDirectory, fileName)

  // Write the template file
  await fs.promises.writeFile(filePath, fileContent).catch((writeFileError: any) => {
    logError(`🚨  Failed to create ${fileName}`, writeFileError);
    throw writeFileError
  });
  log('Created', fileName)
  return { contentTypeId, fileName }
}

