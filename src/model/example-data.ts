import { Edge } from "@xyflow/react";

import { DiagramElement } from "./types";
import exampleDataJson from "./example-data.json";
import emptyProjectJson from "./empty-mindmap.json";

interface ExampleData {
  nodes: DiagramElement[];
  edges: Edge[];
}

export const sampleData: ExampleData =
  exampleDataJson as unknown as ExampleData;

export const emptyProject: ExampleData =
  emptyProjectJson as unknown as ExampleData;
