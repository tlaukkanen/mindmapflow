import { ResourceNodeTypes } from "@/model/node-types";

export function getNamePrefixSuggestion(resourceType: string): string {
  const resource = ResourceNodeTypes.find((r) => r.name === resourceType);

  return resource?.prefix ? `${resource.prefix}name` : "resource-name";
}
