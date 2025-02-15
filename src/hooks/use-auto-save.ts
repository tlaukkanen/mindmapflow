import { useEffect, useRef, useCallback } from "react";
import { Edge } from "@xyflow/react";
import { useSession } from "next-auth/react";
import debounce from "lodash/debounce";
import isEqual from "lodash/isEqual";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";
import { mindMapService } from "@/services/mindmap-service";

// Keep track of unsaved changes globally
let hasUnsavedChanges = false;
let lastSavedNodes: MindMapNode[] = [];
let lastSavedEdges: Edge[] = [];

export function getHasUnsavedChanges() {
  return hasUnsavedChanges;
}

export function setHasUnsavedChanges(value: boolean) {
  if (hasUnsavedChanges !== value) {
    hasUnsavedChanges = value;
    logger.debug("Sending unsavedChangesChanged event:", value);
    // Dispatch event when unsaved changes status changes
    window.dispatchEvent(
      new CustomEvent("unsavedChangesChanged", { detail: value }),
    );
  }
}

export function setLastSavedState(nodes: MindMapNode[], edges: Edge[]) {
  lastSavedNodes = cleanNodesForComparison(nodes);
  lastSavedEdges = [...edges];
}

const cleanNodesForComparison = (nodes: MindMapNode[]) =>
  nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      showHandles: undefined,
      resizing: undefined,
      selected: undefined,
      onAddChild: undefined,
      onAddSibling: undefined,
    },
  }));

export function useAutoSave(
  nodes: MindMapNode[],
  edges: Edge[],
  mindMapId: string | undefined,
  enabled: boolean = true,
  onAutoSave?: (timestamp: Date) => void,
) {
  const { data: session } = useSession();

  // Create a debounced save function that persists between renders
  const debouncedSave = useRef(
    debounce(async (nodes: MindMapNode[], edges: Edge[], mindMapId: string) => {
      try {
        await mindMapService.saveMindMap({ mindMapId, nodes, edges });
        logger.info("Auto-saved diagram to cloud storage");
        lastSavedNodes = cleanNodesForComparison(nodes);
        lastSavedEdges = [...edges];
        setHasUnsavedChanges(false); // Use the function instead of direct assignment
        if (onAutoSave) {
          onAutoSave(new Date());
          // Dispatch the saved event
          window.dispatchEvent(
            new CustomEvent("saved", { detail: new Date() }),
          );
        }
      } catch (error) {
        logger.error("Failed to auto-save diagram:", error);
      }
    }, 5000),
  ).current;

  // Check if there are actual changes
  const checkForChanges = useCallback((nodes: MindMapNode[], edges: Edge[]) => {
    const cleanedCurrentNodes = cleanNodesForComparison(nodes);

    return (
      !isEqual(cleanedCurrentNodes, lastSavedNodes) ||
      !isEqual(edges, lastSavedEdges)
    );
  }, []);

  useEffect(() => {
    if (!enabled || !mindMapId || !session) return;

    // Only mark as unsaved if there are actual changes
    if (checkForChanges(nodes, edges)) {
      setHasUnsavedChanges(true); // Use the function instead of direct assignment
      // Trigger debounced save
      debouncedSave(nodes, edges, mindMapId);
    }

    return () => {
      debouncedSave.cancel();
    };
  }, [
    nodes,
    edges,
    mindMapId,
    enabled,
    session,
    debouncedSave,
    checkForChanges,
  ]);

  // Add beforeunload event listener
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";

        return event.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // Initialize last saved state when component mounts
  useEffect(() => {
    if (nodes && edges) {
      lastSavedNodes = cleanNodesForComparison(nodes);
      lastSavedEdges = [...edges];
    }
  }, []);
}
