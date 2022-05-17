import log from "migrate/lib/log";
import { CreatedFile } from "./createFile";

import { createStore } from "../store";

export default async function rewriteMigration(
  spaceId: string,
  environmentId: string,
  accessToken: string,
  files: CreatedFile[]
) {
  const store = await createStore({
    accessToken,
    environmentId,
    spaceId,
    dryRun: false,
  });

  return store
    .writeState({
      lastRun: files[files.length -1]?.fileName || null,
      migrations: files.map((file) => {
        const contentType = file.contentTypeId;
        return {
          title: file.fileName,
          timestamp: Date.now(),
          description: `Create content model for ${contentType}`,
        };
      }),
    })
    .then(() => log("Wrote contentful migration state", "done"));
}

