import { useEffect, useRef } from "react";
import { Edge } from "@xyflow/react";
import { useSession } from "next-auth/react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";
import { mindMapService } from "@/services/mindmap-service";

export function useAutoSave(
  nodes: MindMapNode[],
  edges: Edge[],
  mindMapId: string | undefined,
  enabled: boolean = true,
  onAutoSave?: (timestamp: Date) => void, // New: optional callback
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { data: session } = useSession();

  useEffect(() => {
    if (!enabled || !mindMapId || !session) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        await mindMapService.saveMindMap({ mindMapId, nodes, edges });
        logger.info("Auto-saved diagram to cloud storage");
        if (onAutoSave) {
          onAutoSave(new Date()); // Report the save timestamp
        }
      } catch (error) {
        logger.error("Failed to auto-save diagram:", error);
      }
    }, 60000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, mindMapId, enabled, session, onAutoSave]);
}
