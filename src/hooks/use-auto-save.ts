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
let lastSavedPaletteId: string | undefined;

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

export function setLastSavedState(
  nodes: MindMapNode[],
  edges: Edge[],
  paletteId?: string,
) {
  lastSavedNodes = cleanNodesForComparison(nodes);
  lastSavedEdges = cleanEdgesForComparison(edges);
  lastSavedPaletteId = paletteId;
}

const cleanNodesForComparison = (nodes: MindMapNode[]) =>
  nodes.map((node) => {
    // Preserve persisted style properties (width/height) but drop volatile ones
    const persistedStyle = node.style
      ? {
          ...(typeof node.style.width !== "undefined"
            ? { width: node.style.width as number }
            : {}),
          ...(typeof node.style.height !== "undefined"
            ? { height: node.style.height as number }
            : {}),
        }
      : undefined;

    return {
      ...node,
      // Keep width/height to persist user-resized size
      selected: false,
      data: {
        ...node.data,
        showHandles: undefined,
        resizing: undefined,
        onAddChild: undefined,
        onAddSibling: undefined,
      },
      zIndex: undefined,
      style: persistedStyle,
      interactionWidth: undefined,
      className: undefined,
    } as MindMapNode;
  });

const cleanEdgesForComparison = (edges: Edge[]) =>
  edges.map((edge) => ({
    ...edge,
    selected: undefined,
    animated: undefined,
    style: undefined,
    interactionWidth: undefined,
    zIndex: undefined,
  }));

export function useAutoSave(
  nodes: MindMapNode[],
  edges: Edge[],
  mindMapId: string | undefined,
  enabled: boolean = true,
  onAutoSave?: (timestamp: Date) => void,
  paletteId?: string,
) {
  const { data: session } = useSession();

  // Create a debounced save function that persists between renders
  const debouncedSave = useRef(
    debounce(
      async (
        nodes: MindMapNode[],
        edges: Edge[],
        mindMapId: string,
        currentPaletteId?: string,
      ) => {
        try {
          // Double check mindMapId hasn't changed since debounce was triggered
          if (mindMapId !== window.location.pathname.split("/").pop()) {
            logger.debug("Skipping auto-save as mindMapId has changed");

            return;
          }

          await mindMapService.saveMindMap({
            mindMapId,
            nodes,
            edges,
            paletteId: currentPaletteId,
          });
          logger.info(`Auto-saved diagram ${mindMapId} to cloud storage`);
          lastSavedNodes = cleanNodesForComparison(nodes);
          lastSavedEdges = cleanEdgesForComparison(edges);
          lastSavedPaletteId = currentPaletteId;
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
      },
      5000,
    ),
  ).current;

  // Check if there are actual changes
  const checkForChanges = useCallback(
    (nodes: MindMapNode[], edges: Edge[], currentPaletteId?: string) => {
      const cleanedCurrentNodes = cleanNodesForComparison(nodes);
      const cleanedCurrentEdges = cleanEdgesForComparison(edges);
      const hasNodesChanged = !isEqual(cleanedCurrentNodes, lastSavedNodes);
      const hasEdgesChanged = !isEqual(cleanedCurrentEdges, lastSavedEdges);
      const hasPaletteChanged = currentPaletteId !== lastSavedPaletteId;

      if (hasNodesChanged) {
        // Log node changes by comparing JSON strings
        cleanedCurrentNodes.forEach((currentNode, index) => {
          if (index < lastSavedNodes.length) {
            const lastNode = lastSavedNodes[index];

            if (!isEqual(currentNode, lastNode)) {
              const currentJson = JSON.stringify(currentNode, null, 2);
              const lastJson = JSON.stringify(lastNode, null, 2);

              logger.debug(`Node ${currentNode.id} changed:`, {
                current: currentJson,
                previous: lastJson,
                // Simple text diff (can be expanded for more sophisticated diffing)
                diff:
                  currentJson.length === lastJson.length
                    ? "Same length, different content"
                    : `Length changed from ${lastJson.length} to ${currentJson.length} chars`,
              });
            }
          } else {
            logger.debug(`New node detected: ${currentNode.id}`, {
              nodeData: JSON.stringify(currentNode, null, 2),
            });
          }
        });

        if (cleanedCurrentNodes.length < lastSavedNodes.length) {
          const removedNodes = lastSavedNodes
            .filter(
              (node) =>
                !cleanedCurrentNodes.some((current) => current.id === node.id),
            )
            .map((node) => node.id);

          logger.debug(
            `${lastSavedNodes.length - cleanedCurrentNodes.length} nodes were removed:`,
            {
              removedNodeIds: removedNodes,
            },
          );
        }
      }

      if (hasEdgesChanged) {
        // Log edge changes by comparing JSON strings
        cleanedCurrentEdges.forEach((currentEdge, index) => {
          if (index < lastSavedEdges.length) {
            const lastEdge = lastSavedEdges[index];

            if (!isEqual(currentEdge, lastEdge)) {
              const currentJson = JSON.stringify(currentEdge, null, 2);
              const lastJson = JSON.stringify(lastEdge, null, 2);

              logger.debug(`Edge ${currentEdge.id} changed:`, {
                current: currentJson,
                previous: lastJson,
                diff:
                  currentJson.length === lastJson.length
                    ? "Same length, different content"
                    : `Length changed from ${lastJson.length} to ${currentJson.length} chars`,
              });
            }
          } else {
            logger.debug(`New edge detected: ${currentEdge.id}`, {
              edgeData: JSON.stringify(currentEdge, null, 2),
            });
          }
        });

        if (cleanedCurrentEdges.length < lastSavedEdges.length) {
          const removedEdges = lastSavedEdges
            .filter(
              (edge) =>
                !cleanedCurrentEdges.some((current) => current.id === edge.id),
            )
            .map((edge) => edge.id);

          logger.debug(
            `${lastSavedEdges.length - cleanedCurrentEdges.length} edges were removed:`,
            {
              removedEdgeIds: removedEdges,
            },
          );
        }
      }

      logger.debug("Nodes changed:", hasNodesChanged);
      logger.debug("Edges changed:", hasEdgesChanged);
      logger.debug("Palette changed:", hasPaletteChanged);

      return (
        hasNodesChanged ||
        hasEdgesChanged ||
        hasPaletteChanged ||
        hasUnsavedChanges
      );
    },
    [],
  );

  useEffect(() => {
    if (!enabled || !mindMapId || !session) return;

    // Only mark as unsaved if there are actual changes
    if (checkForChanges(nodes, edges, paletteId)) {
      setHasUnsavedChanges(true); // Use the function instead of direct assignment
      // Trigger debounced save
      debouncedSave(nodes, edges, mindMapId, paletteId);
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
    hasUnsavedChanges,
    paletteId,
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
      lastSavedEdges = cleanEdgesForComparison(edges);
      lastSavedPaletteId = paletteId;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
