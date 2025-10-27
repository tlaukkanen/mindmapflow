import { TextProperties } from "../nodes/base-node";

import { ResourceNodeTypes } from "@/model/node-types";

export const getDefaultTextProperties = (
  resourceType: string,
): TextProperties | undefined => {
  const resource = ResourceNodeTypes.find((r) => r.name === resourceType);

  if (resource?.defaultTextProperties) {
    return resource.defaultTextProperties;
  }

  return undefined;
};
