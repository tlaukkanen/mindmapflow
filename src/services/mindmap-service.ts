import { Edge } from "@xyflow/react";
import { toast } from "sonner";

import { logger } from "./logger";

import { MindMapNode } from "@/model/types";
import emptyMindMap from "@/model/empty-mindmap.json"; // Added import for empty mindmap

export interface SaveMindMapParams {
  mindMapId: string;
  nodes: MindMapNode[];
  edges: Edge[];
  lastModified?: Date;
}

export interface MindMapData {
  nodes: MindMapNode[];
  edges: Edge[];
  lastModified: Date;
}

class MindMapService {
  async saveMindMap({
    mindMapId,
    nodes,
    edges,
    lastModified,
  }: SaveMindMapParams) {
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
          lastModified,
        }),
      });

      if (response.status === 409) {
        const data = await response.json();

        logger.warn("Conflict detected:", data.lastModified);
        toast.error(
          "Conflict detected, unable to save. Please refresh the page.",
        );
        throw new Error("CONFLICT:" + data.lastModified);
      }

      if (!response.ok) {
        throw new Error("Failed to save mindmap");
      }

      const data = await response.json();

      return data.lastModified;
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

      if (response.status === 404) {
        throw new Error("Mind map not found");
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

  // New function to initialize an empty mindmap
  createEmptyMindmap() {
    // You could update properties based on mindMapId if needed.
    return emptyMindMap;
  }

  async copyMindMap(mindMapId: string) {
    try {
      const response = await fetch(`/api/mindmaps/${mindMapId}/copy`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        throw new Error("Unauthorized");
      }

      if (!response.ok) {
        throw new Error("Failed to copy diagram");
      }

      const data = await response.json();

      return {
        newMindMapId: data.newMindMapId,
        lastModified: new Date(data.lastModified),
      };
    } catch (error) {
      logger.error("Error copying diagram:", error);
      throw error;
    }
  }
}

export const mindMapService = new MindMapService();
