import { Edge } from "@xyflow/react";

import { logger } from "./logger";

import { MindMapNode } from "@/model/types";

export interface SaveMindMapParams {
  mindMapId: string;
  nodes: MindMapNode[];
  edges: Edge[];
}

class MindMapService {
  async saveMindMap({ mindMapId, nodes, edges }: SaveMindMapParams) {
    try {
      const response = await fetch("/api/mindmaps", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mindMapId,
          nodes,
          edges,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save mindmap");
      }

      return true;
    } catch (error) {
      logger.error("Error saving mindmap:", error);
      throw error;
    }
  }

  async loadMindMap(mindMapId: string) {
    try {
      const response = await fetch(`/api/mindmaps?id=${mindMapId}`);

      if (response.status === 401) {
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error("Failed to load diagram");
      }

      return await response.json();
    } catch (error) {
      logger.error("Error loading diagram:", error);
      throw error;
    }
  }
}

export const mindMapService = new MindMapService();
