import { useCallback } from "react";
import { toast } from "sonner";
import { Edge } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { mindMapService } from "@/services/mindmap-service";
import { logger } from "@/services/logger";

export function useMindMap() {
  const loadMindMap = useCallback(async (mindMapId: string) => {
    try {
      const data = await mindMapService.loadMindMap(mindMapId);

      return data;
    } catch (error) {
      if (error instanceof Error && error.message === "Unauthorized") {
        toast.error("Please sign in to access your diagram");
      } else {
        logger.error("Error loading diagram:", error);
      }

      return null;
    }
  }, []);

  const saveMindMap = useCallback(
    async (mindMapId: string, nodes: MindMapNode[], edges: Edge[]) => {
      try {
        await mindMapService.saveMindMap({ mindMapId, nodes, edges });
        toast.success("Mindmap saved successfully");

        return true;
      } catch (error) {
        toast.error(`Failed to save mindmap: ${error?.message}`);

        return false;
      }
    },
    [],
  );

  return {
    loadMindMap,
    saveMindMap,
  };
}
