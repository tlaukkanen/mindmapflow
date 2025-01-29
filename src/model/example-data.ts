import { Edge } from "@xyflow/react";

import { MindMapNode } from "./types";
import exampleDataJson from "./example-data.json";
import emptyProjectJson from "./empty-mindmap.json";

interface ExampleData {
  nodes: MindMapNode[];
  edges: Edge[];
}

export const sampleData: ExampleData =
  exampleDataJson as unknown as ExampleData;

export const emptyProject: ExampleData =
  emptyProjectJson as unknown as ExampleData;
