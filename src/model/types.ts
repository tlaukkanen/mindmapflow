import { Node } from "@xyflow/react";

import { TextProperties } from "@/components/editor/nodes/base-node";

export interface Position {
  x: number;
  y: number;
}

export interface ResourceOption {
  name: string;
  value: string;
  show: boolean;
}

export interface DiagramElement extends Node {
  data: {
    resourceType: string;
    iconName?: string;
    backgroundColor?: string;
    showFrame?: boolean;
    resourceName?: string;
    description?: string;
    showHandles?: boolean;
    sku?: string;
    isEditing?: boolean;
    textProperties?: TextProperties;
    resourceOptions?: ResourceOption[];
  };
}

export interface Project {
  id: string;
  name: string;
  elements: DiagramElement[];
}
