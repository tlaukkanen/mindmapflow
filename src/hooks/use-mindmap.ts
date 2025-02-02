import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Edge } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { mindMapService } from "@/services/mindmap-service";
import { logger } from "@/services/logger";

export function useMindMap() {
  const [lastModified, setLastModified] = useState<Date>();

  const loadMindMap = useCallback(async (mindMapId: string) => {
    try {
      const data = await mindMapService.loadMindMap(mindMapId);

      setLastModified(new Date(data.lastModified));

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
        const newLastModified = await mindMapService.saveMindMap({
          mindMapId,
          nodes,
          edges,
          lastModified,
        });

        setLastModified(new Date(newLastModified));
        window.dispatchEvent(
          new CustomEvent("saved", { detail: new Date(newLastModified) }),
        );

        toast.success("Mindmap saved successfully");
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("CONFLICT:")) {
          const serverLastModified = new Date(error.message.split(":")[1]);
          const shouldOverwrite = window.confirm(
            `This mindmap was modified elsewhere at ${serverLastModified.toLocaleString()}. Do you want to overwrite those changes?`,
          );

          if (shouldOverwrite) {
            // Force save without lastModified check
            const newLastModified = await mindMapService.saveMindMap({
              mindMapId,
              nodes,
              edges,
            });

            setLastModified(new Date(newLastModified));
            toast.success("Mindmap saved successfully");
          } else {
            toast.info("Save cancelled - please reload to get latest changes");
          }

          return;
        }
        toast.error("Failed to save mindmap");
        throw error;
      }
    },
    [lastModified],
  );

  return {
    loadMindMap,
    saveMindMap,
    lastModified,
  };
}
