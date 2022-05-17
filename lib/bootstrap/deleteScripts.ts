import log, { error as logError } from 'migrate/lib/log'
import rimraf from 'rimraf'

export default function deleteScripts (migrationsDirectory: string) {
  return new Promise((resolve, reject) => {
    return rimraf(migrationsDirectory, (error: any) => {
      if (error) {
        reject(logError('🚨   Failed to delete migrations folder', error))
      }
      resolve(log('Migrations folder', 'deleted'))
    })
  })
}
