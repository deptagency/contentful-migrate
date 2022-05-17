import path from 'path'
import fs from 'fs'
import log, { error as logError } from 'migrate/lib/log'
import mkdirp from 'mkdirp'
import dateformat from 'dateformat'

const camelToDash = (string: string) => string.replace(/([A-Z])/g, char => `-${char.toLowerCase()}`)

export interface CreatedFile { contentTypeId: string, fileName: string }
export default function createFile(
  contentTypeId: string, fileContent: string, migrationsDirectory: string
): Promise<CreatedFile> {
  const directory = path.join(migrationsDirectory, contentTypeId)
  return new Promise((resolve, reject) => {
    // Ensure migrations directory exists
    mkdirp(directory).catch((makeDirectoryError) => {
      if (makeDirectoryError) {
        reject(logError(`🚨  Failed to create ${directory}`, makeDirectoryError))
      }

      // Fix up file path
      const date = dateformat(new Date(), 'UTC:yyyymmddHHMMss')
      const fileName = `${date}-create-${camelToDash(contentTypeId)}.js`
      const filePath = path.join(directory, fileName)

      // Write the template file
      return fs.promises.writeFile(filePath, fileContent).catch((writeFileError: any) => {
        if (writeFileError) {
          reject(logError(`🚨  Failed to create ${directory}/${fileName}`, writeFileError))
        }
        log('Created', `${directory}/${fileName}`)
        resolve({ contentTypeId, fileName })
      })
    })
  })
}

