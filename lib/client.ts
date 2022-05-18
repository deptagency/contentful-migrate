import contentful, { createClient } from "contentful-management";
export interface Args {
  accessToken: string;
  spaceId: string;
  environmentId: string;
}
export default function getClient({ environmentId, spaceId, accessToken }: Args): Promise<contentful.Environment> {
 return createClient({ accessToken })
  .getSpace(spaceId)
  .then(space => space.getEnvironment(environmentId))
}
