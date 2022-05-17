declare module 'migrate/lib/log' {
  declare function log(key: string, msg: any): void;
  export = log;
  export const error = log;
}

declare module 'migrate/lib/migrate' {
 declare function migrate (set: MigrationSet, direction: 'up' | 'down', migrationName: string, fn: (error:? Error) => void);
 export = migrate;
}

declare module 'migrate/lib/template-generator' {
  interface TemplateOptions {
    name: string;
    dateFormat: string;
    templateFile?: string;
    migrationsDirectory?: string;
    extension: string;
  }
  declare function templateGenerator(opts: TemplateOptions, cb: (err: Error|null, path: string) => void);
  export = templateGenerator;
}
