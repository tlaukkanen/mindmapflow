import { useEffect, useRef } from "react";
import { Edge } from "@xyflow/react";
import { useSession } from "next-auth/react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

export function useAutoSave(
  nodes: MindMapNode[],
  edges: Edge[],
  mindMapId: string | undefined,
  enabled: boolean = true,
) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { data: session } = useSession();

  useEffect(() => {
    if (!enabled || !mindMapId) return;

    if (!session) {
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch("/api/diagrams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mindMapId: mindMapId, nodes, edges }),
        });

        if (!response.ok) {
          throw new Error("Failed to save diagram");
        }

        logger.info("Auto-saved diagram to cloud storage");
      } catch (error) {
        logger.error("Failed to auto-save diagram:", error);
      }
    }, 60000);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [nodes, edges, mindMapId, enabled]);
}
