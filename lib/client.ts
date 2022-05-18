import contentful, { createClient } from "contentful-management";
export interface Args {
  accessToken: string;
  spaceId: string;
  environmentId: string;
}

export function checkAccessToken(accessToken: string) {
  if (!/^CFPAT-/.test(accessToken)) {
    throw new Error(`access token does not match pattern. Make sure you're using a personal access token`);
  }
}

export default function getClient({ environmentId, spaceId, accessToken }: Args): Promise<contentful.Environment> {

  return createClient({ accessToken })
    .getSpace(spaceId)
    .then(space => space.getEnvironment(environmentId))
}
