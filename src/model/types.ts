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

export interface MindMapNode extends Node {
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
    url?: string;
    textProperties?: TextProperties;
    resourceOptions?: ResourceOption[];
    depth?: number; // Depth of the node in the tree
    onAddChild?: () => void; // Moved inside data
    onAddSibling?: () => void; // Moved inside data
    lastDirection?: "left" | "right" | "top" | "bottom"; // Add this line
  };
}

export interface Project {
  id: string;
  name: string;
  elements: MindMapNode[];
}
