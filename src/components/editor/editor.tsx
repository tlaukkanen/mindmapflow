"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Edge,
  Node,
  MarkerType,
  useEdgesState,
  useNodesState,
  useReactFlow,
  OnNodesChange,
  NodeChange, // Add this import
} from "@xyflow/react";
import { toast } from "sonner";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { nanoid } from "nanoid";

import { PropertiesPanelHandle } from "./properties-panel";
import Canvas from "./canvas";
import PropertiesPanel from "./properties-panel";
import { Toolbar } from "./toolbar";
import { Menubar } from "./menubar";
import { TextProperties } from "./nodes/base-node";

import { useEditor } from "@/store/editor-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";
import { sampleData } from "@/model/example-data";
import { ResourceNodeTypes } from "@/model/node-types";
import {
  findClosestNodeInDirection,
  getAbsolutePosition,
  updateEdgeConnections,
} from "@/utils/node-utils";
import {
  useAutoSave,
  setHasUnsavedChanges,
  setLastSavedState,
} from "@/hooks/use-auto-save";
import { useMindMap } from "@/hooks/use-mindmap";
import { mindMapService } from "@/services/mindmap-service"; // Added import
import { useTheme } from "@/components/providers/ThemeProvider";
import { DEFAULT_PALETTE_ID } from "@/config/palettes";

const initialNodes: MindMapNode[] = sampleData.nodes;
const initialEdges: Edge[] = sampleData.edges;
const rootNodeId = "root";

// Add this helper function before the Editor component
const cleanNodesForStorage = (nodes: MindMapNode[]) => {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      showHandles: undefined,
      resizing: undefined,
      selected: undefined,
    },
  }));
};

/** Helper to update data for a selected node */
function updateSelectedNodeData(
  nodes: MindMapNode[],
  selectedNodeId: string | null,
  updater: (data: any) => any,
) {
  if (!selectedNodeId) return nodes;

  return nodes.map((node) =>
    node.id === selectedNodeId ? { ...node, data: updater(node.data) } : node,
  );
}

// Add where nodes are created/initialized
export const getDefaultTextProperties = (
  resourceType: string,
): TextProperties | undefined => {
  const resource = ResourceNodeTypes.find((r) => r.name === resourceType);

  if (resource?.defaultTextProperties) {
    return resource.defaultTextProperties;
  }

  return undefined;
};

const findFreePosition = (
  nodes: MindMapNode[],
  basePosition: { x: number; y: number },
  spacing: number = 100,
  parentId: string | undefined,
  getIntersectingNodes: (node: Node) => Node[],
): { x: number; y: number } => {
  // If there's a parent, convert basePosition to absolute coordinates
  logger.debug(
    `Finding free position for layout for base position ${basePosition.x}, ${basePosition.y}, spacing ${spacing}`,
  );

  if (parentId) {
    const parent = nodes.find((n) => n.id === parentId);

    if (parent) {
      const parentAbsPos = getAbsolutePosition(parent, nodes);

      basePosition = {
        x: parentAbsPos.x + basePosition.x,
        y: parentAbsPos.y + basePosition.y,
      };
    }
  }

  // Create a temporary node to check intersections with absolute position
  const tempNode: Node = {
    id: "temp",
    type: "rectangleShape",
    position: basePosition,
    data: {},
    width: 100,
    height: 40,
  };

  let offset = 0;
  const position = { ...basePosition };

  tempNode.position = position;

  // Keep trying new positions until we find one with no intersections
  let tries = 0;

  while (getIntersectingNodes(tempNode).length > 0) {
    if (tries % 2 === 0) {
      offset += spacing;
    }
    position.y = basePosition.y + offset * (tries % 2 === 0 ? 1 : -1);
    logger.debug(`Trying new vertical position ${position.x}, ${position.y}`);
    tempNode.position = position;
    tries++;
  }

  // Convert back to relative position if there's a parent
  if (parentId) {
    const parent = nodes.find((n) => n.id === parentId);

    if (parent) {
      const parentAbsPos = getAbsolutePosition(parent, nodes);
      const convertedPosition = {
        x: position.x - parentAbsPos.x,
        y: position.y - parentAbsPos.y,
      };

      return convertedPosition;
    }
  }

  return position;
};

export default function Editor() {
  const searchParams = useSearchParams();
  const params = useParams();
  const showSample = searchParams?.get("showSample") === "true";
  const { isFullScreen, setIsFullScreen } = useEditor();
  const {
    getIntersectingNodes,
    deleteElements,
    fitView,
    getViewport,
    getNodesBounds,
    getEdges,
  } = useReactFlow();

  // Update mindMapId to use state
  const [mindMapId, setMindMapId] = useState<string | undefined>(() => {
    const id = params?.id as string;

    return id || undefined;
  });

  const [isPropertiesPanelVisible, setIsPropertiesPanelVisible] =
    useState(false);
  const [showGrid, setShowGrid] = useState(false); // Add state for grid visibility
  const [nodes, setNodes, onNodesChange] = useNodesState(
    showSample ? initialNodes : [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    showSample ? initialEdges : [],
  );
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const propertiesPanelRef = useRef<PropertiesPanelHandle>(null);
  const [copiedNodes, setCopiedNodes] = useState<MindMapNode[]>([]);
  const [pasteCount, setPasteCount] = useState(0);
  const { data: session } = useSession();
  const { loadMindMap } = useMindMap();
  const settingUpNewProject = useRef(false);
  const { palette, setPaletteId: setThemePaletteId } = useTheme();

  // Add the auto-save hook
  useAutoSave(
    nodes,
    edges,
    mindMapId,
    true,
    (timestamp: Date) => {
      window.dispatchEvent(new CustomEvent("saved", { detail: timestamp }));
    },
    palette.id,
  );

  const handleLoadMindMap = useCallback(async () => {
    if (!mindMapId) return;

    // Force clear unsaved changes state when explicitly loading a new mindmap
    setHasUnsavedChanges(false);
    setLastSavedState([], [], palette.id);
    if (settingUpNewProject.current) {
      settingUpNewProject.current = false;
      logger.debug("Setting up new project, skipping load");

      return;
    }
    logger.debug("Loading mindmap in handleLoadMindMap", mindMapId);
    const data = await loadMindMap(mindMapId);

    if (data) {
      const loadedPaletteId = data.paletteId ?? DEFAULT_PALETTE_ID;

      setThemePaletteId(loadedPaletteId);
      setNodes(data.nodes);
      setEdges(data.edges);
      // Update last saved state with the newly loaded data
      setLastSavedState(data.nodes, data.edges, loadedPaletteId);
      fitView({ padding: 100, maxZoom: 1.0, duration: 1500, minZoom: 1.0 });
    }
  }, [
    mindMapId,
    setNodes,
    setEdges,
    loadMindMap,
    fitView,
    settingUpNewProject,
    setThemePaletteId,
  ]);

  // Add useEffect to load diagram on mount
  useEffect(() => {
    if (session?.user && mindMapId) {
      logger.debug("Loading mindmap on mount", mindMapId);
      handleLoadMindMap();
    }
  }, [handleLoadMindMap, session?.user, mindMapId]);

  // Derive selected node from selectedNodeId
  const selectedNode = nodes.find((node) => node.id === selectedNodeId);

  const copyJsonToClipboard = () => {
    const cleanedNodes = cleanNodesForStorage(nodes);
    const project = {
      nodes: cleanedNodes,
      edges,
    };

    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    toast.success("Project copied to clipboard");
  };

  const onNewProject = () => {
    logger.info("Creating new project");
    settingUpNewProject.current = true;
    const newMindMapId = nanoid(10);
    const emptyProject = mindMapService.createEmptyMindmap();
    const initialPaletteId = palette.id ?? DEFAULT_PALETTE_ID;

    setMindMapId(newMindMapId);
    setNodes(emptyProject.nodes as MindMapNode[]);
    setEdges(emptyProject.edges);
    window.history.pushState({}, "", `/editor/${newMindMapId}`);
    fitView({ padding: 100, maxZoom: 1.0, duration: 1500, minZoom: 1.0 });
    // Set hasUnsavedChanges to false since this is a fresh project
    setHasUnsavedChanges(false);
    setThemePaletteId(initialPaletteId);
    setLastSavedState(
      emptyProject.nodes as MindMapNode[],
      emptyProject.edges,
      initialPaletteId,
    );
  };

  // Add handler for toggling grid visibility
  const handleToggleGrid = useCallback(() => {
    logger.info(`Toggling grid visibility to ${!showGrid}`);
    setShowGrid(!showGrid);
  }, [showGrid]);

  const onLoadMindMap = useCallback(() => {
    logger.info("Loading mindmap");
    handleLoadMindMap();
  }, [handleLoadMindMap]);

  const onSaveMindMap = useCallback(() => {
    logger.info("Saving mindmap");
  }, []);

  const handleNodeNameChange = (newName: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        resourceName: newName,
      })),
    );
  };

  const handleEdgeLabelChange = (newLabel: string) => {
    if (!selectedEdgeId) return;

    setEdges(
      edges.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, label: newLabel } : edge,
      ),
    );
  };

  const handleEdgeAnimatedChange = (animated: boolean) => {
    if (!selectedEdgeId) return;

    setEdges(
      edges.map((edge) =>
        edge.id === selectedEdgeId ? { ...edge, animated } : edge,
      ),
    );
  };

  const handleTextPropertiesChange = (props: Partial<TextProperties>) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        textProperties: {
          ...data.textProperties,
          ...props,
        },
      })),
    );
  };

  const handleNodeSelection = useCallback((nodes: MindMapNode[]) => {
    if (nodes.length === 0) {
      return;
    }

    const nodeIds = nodes.map((node) => node.id);

    // Only update if the selection has actually changed
    setSelectedNodeIds((prevIds) => {
      if (
        prevIds.length === nodeIds.length &&
        prevIds.every((id) => nodeIds.includes(id))
      ) {
        return prevIds;
      }

      return nodeIds;
    });

    // Update the single selected node for properties panel
    setSelectedNodeId(nodeIds.length > 0 ? nodeIds[nodeIds.length - 1] : null);

    // Get the current viewport
    const viewport = getViewport();
    const { x, y, zoom } = viewport;
    const bounds = getNodesBounds(nodes);

    // Calculate viewport boundaries in flow coordinates
    const viewportLeft = -x / zoom;
    const viewportRight = (-x + window.innerWidth) / zoom;
    const viewportTop = -y / zoom;
    const viewportBottom = (-y + window.innerHeight) / zoom;

    // Check if node bounds intersect with viewport
    const isVisible = !(
      bounds.x > viewportRight ||
      bounds.x + bounds.width < viewportLeft ||
      bounds.y > viewportBottom ||
      bounds.y + bounds.height < viewportTop
    );

    // Only fit view if node is not visible
    if (!isVisible) {
      // Make sure that selected nodes are visible
      fitView({
        nodes,
        duration: 1500,
        maxZoom: 1.0,
      });
    }
  }, []);

  const handleEdgeSelection = (edge: Edge | null) => {
    if (edge?.id !== selectedEdgeId && (edge || selectedEdgeId)) {
      logger.info(
        `(Editor) Selected edge ${edge?.id}, current: ${selectedEdgeId}`,
      );
      setSelectedEdgeId(edge?.id || null);
    }
  };

  const handleDeleteNodeOrEdge = useCallback(() => {
    if (selectedNodeIds.length > 0) {
      logger.info("Deleting nodes", selectedNodeIds);
      if (selectedNodeIds && selectedNodeIds.includes(rootNodeId)) {
        toast.warning("Cannot delete the root idea node 🙈");

        return;
      }

      const deleteNodes = nodes.filter((node) =>
        selectedNodeIds.includes(node.id),
      );

      deleteElements({ nodes: deleteNodes, edges: [] });

      setSelectedNodeIds([]);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      toast.warning("Can't delete the relations. Delete the node instead.");

      return;
    }
  }, [selectedNodeIds, selectedEdgeId, nodes, setNodes]);

  const handleSearchFocus = useCallback(() => {
    logger.info("Focusing search input");
    const searchInput = document.querySelector<HTMLInputElement>(
      "#search-resources-input",
    );

    searchInput?.focus();
  }, []);

  const handleNodeDoubleClick = useCallback(() => {
    setTimeout(() => {
      if (selectedEdgeId) {
        propertiesPanelRef.current?.focusEdgeLabelInput();
      } else if (selectedNode) {
        if (selectedNode.type?.startsWith("azure")) {
          propertiesPanelRef.current?.focusNameInput();
        }
        // Comment or remove this else block to remove focusing description
        // else {
        //   propertiesPanelRef.current?.focusDescriptionInput();
        // }
      }
    }, 20);
  }, [selectedEdgeId, selectedNode]);

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);

    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      setPasteCount(0); // Reset paste count when copying
      toast.success(
        `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}`,
      );
    }
  }, [nodes]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) return;

    // Unselect all nodes from canvas before pasting
    setNodes((prev) =>
      prev.map((node) => (node.selected ? { ...node, selected: false } : node)),
    );

    // Create a mapping of old node IDs to new node IDs
    const idMapping = new Map<string, string>();

    const newNodes = copiedNodes.map((node) => {
      const newId = crypto.randomUUID();

      idMapping.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 20 * (pasteCount + 1),
          y: node.position.y + 20 * (pasteCount + 1),
        },
        selected: true,
      };
    });

    // Copy edges that connect copied nodes (both internal and to parents)
    const newEdges = edges
      .filter((edge) => {
        // Include edges where at least the target node is in the copied selection
        // This ensures we maintain connections to parent nodes
        const targetNode = copiedNodes.find((node) => node.id === edge.target);

        return targetNode !== undefined;
      })
      .map((edge) => {
        const newTarget = idMapping.get(edge.target)!;
        // Use either the mapped source (if it was copied) or keep the original source (for parent connections)
        const newSource = idMapping.get(edge.source) || edge.source;

        return {
          ...edge,
          id: `e-${newSource}-${newTarget}`,
          source: newSource,
          target: newTarget,
          sourceHandle: edge.sourceHandle?.replace(edge.source, newSource),
          targetHandle: edge.targetHandle?.replace(edge.target, newTarget),
        };
      });

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
    setPasteCount((count) => count + 1);
    toast.success(
      `Pasted ${newNodes.length} node${newNodes.length > 1 ? "s" : ""}`,
    );
  }, [copiedNodes, setNodes, setEdges, edges, pasteCount]);

  const handleEdgeDirectionSwitch = useCallback(() => {
    if (!selectedEdgeId) return;

    setEdges((edges) =>
      edges.map((edge) =>
        edge.id === selectedEdgeId
          ? {
              ...edge,
              source: edge.target,
              sourceHandle: edge.targetHandle,
              target: edge.source,
              targetHandle: edge.sourceHandle,
            }
          : edge,
      ),
    );
  }, [selectedEdgeId, setEdges]);

  const handleEdgeMarkerChange = useCallback(
    (markerStart: boolean, markerEnd: boolean) => {
      if (!selectedEdgeId) return;

      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === selectedEdgeId
            ? {
                ...edge,
                markerStart: markerStart
                  ? {
                      type: MarkerType.ArrowClosed,
                      width: 30,
                      height: 30,
                    }
                  : undefined,
                markerEnd: markerEnd
                  ? {
                      type: MarkerType.ArrowClosed,
                      width: 30,
                      height: 30,
                    }
                  : undefined,
              }
            : edge,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const handleEnterKey = useCallback(() => {
    if (
      !selectedNode ||
      !selectedNodeId ||
      selectedNode?.data.isEditing ||
      selectedNode.type === "noteShape"
    )
      return;

    const rootNode = nodes.find((node) => !node.parentId);

    if (!rootNode) return;

    const isSelectedNodeRoot = selectedNode.id === rootNodeId;

    if (isSelectedNodeRoot) return;

    const parentNode = nodes.find((node) => node.id === selectedNode.parentId);
    const parentNodeId = parentNode?.id;

    const selectedNodePosition = getAbsolutePosition(selectedNode, nodes);
    const rootPosition = rootNode.position;
    const shouldAddAbove = selectedNodePosition.y > rootPosition.y;

    const shouldAddToRight =
      isSelectedNodeRoot || selectedNodePosition.x > rootPosition.x;

    const verticalSpace =
      parentNode?.data.depth == 0 ? 80 : parentNode?.data.depth == 1 ? 5 : 5;

    const basePosition = {
      x: shouldAddToRight ? 240 : -240,
      y: shouldAddAbove ? -verticalSpace : verticalSpace,
    };

    // Find a free position for the new node using getIntersectingNodes
    const freePosition = findFreePosition(
      nodes,
      basePosition,
      verticalSpace,
      parentNodeId,
      getIntersectingNodes,
    );

    const newNode: MindMapNode = {
      id: crypto.randomUUID(),
      type: "rectangleShape",
      position: freePosition,
      data: {
        description: "",
        resourceType: "generic",
        textProperties: getDefaultTextProperties("generic"),
        isEditing: true,
        depth: (parentNode?.data?.depth || 0) + 1,
      },
      //width: 100,
      //height: 40,
      selected: true,
      parentId: selectedNode.parentId,
    };

    // Create edge between parent node and new node (if parent exists)
    const newEdges = [...edges];

    if (parentNodeId) {
      const newEdge: Edge = {
        id: `e-${parentNodeId}-${newNode.id}`,
        source: parentNodeId,
        target: newNode.id,
        sourceHandle: shouldAddToRight
          ? `${parentNodeId}-right-source`
          : `${parentNodeId}-left-source`,
        targetHandle: shouldAddToRight
          ? `${newNode.id}-left-target`
          : `${newNode.id}-right-target`,
        type: "default",
      };

      newEdges.push(newEdge);
    }

    // Update nodes and edges
    setNodes((nds) => [
      ...nds.map((n) => ({ ...n, selected: false })),
      newNode,
    ]);
    setEdges(newEdges);

    // Set the new node as selected
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  }, [
    selectedNodeId,
    selectedNode,
    nodes,
    edges,
    setNodes,
    setEdges,
    getIntersectingNodes,
  ]);

  const handleArrowNavigation = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      if (!selectedNode) return;

      const closestNode = findClosestNodeInDirection(
        selectedNode,
        nodes,
        direction,
      );

      if (closestNode) {
        // Unselect all nodes
        setNodes((nds) =>
          nds.map((node) => ({
            ...node,
            selected: node.id === closestNode.id,
          })),
        );
        setSelectedNodeId(closestNode.id);
        setSelectedNodeIds([closestNode.id]);
      }
    },
    [selectedNode, nodes, setNodes],
  );

  type Direction = "left" | "right" | "top" | "bottom";

  const determineWhichSideToAddChildNode = useCallback(
    (parentNode: MindMapNode): Direction => {
      const edges = getEdges();
      const connections = {
        right: edges.filter(
          (e) =>
            e.source === parentNode.id &&
            e.sourceHandle === `${parentNode.id}-right-source`,
        ).length,
        left: edges.filter(
          (e) =>
            e.source === parentNode.id &&
            e.sourceHandle === `${parentNode.id}-left-source`,
        ).length,
        top: edges.filter(
          (e) =>
            e.source === parentNode.id &&
            e.sourceHandle === `${parentNode.id}-top-source`,
        ).length,
        bottom: edges.filter(
          (e) =>
            e.source === parentNode.id &&
            e.sourceHandle === `${parentNode.id}-bottom-source`,
        ).length,
      };

      // If root node, balance between all sides
      if (parentNode.id === rootNodeId) {
        const minConnections = Math.min(
          connections.left,
          connections.right,
          connections.top,
          connections.bottom,
        );

        // Prefer horizontal expansion first
        if (connections.left === minConnections) return "left";
        if (connections.right === minConnections) return "right";
        if (connections.top === minConnections) return "top";

        return "bottom";
      }

      // If parent node doesn't have outgoing connections (parent = source), then prefer
      // the side that is opposite to the incoming connection (parent = target)
      const outgoingTotal =
        connections.left +
        connections.right +
        connections.top +
        connections.bottom;

      if (outgoingTotal === 0) {
        const incomingEdges = edges.filter(
          (edge) => edge.target === parentNode.id && edge.targetHandle,
        );

        if (incomingEdges.length > 0) {
          const handle = incomingEdges[0].targetHandle || "";
          const parts = handle.split("-");

          if (parts.length >= 3) {
            // First part might be GUID of the node
            // Direction is the second to last part
            const incomingDirection = parts[parts.length - 2] as Direction;

            return getOppositeHandle(incomingDirection);
          }
        }
      }

      // If no last direction, find the side with most outgoing connections
      const sorted = Object.entries(connections).sort((a, b) => b[1] - a[1]);

      logger.debug(`Sorted connections: ${JSON.stringify(sorted)}`);

      return sorted[0][0] as Direction;
    },
    [edges],
  );

  // Update getBasePosition helper (new function)
  const getBasePosition = (direction: Direction) => ({
    x: direction === "right" ? 200 : direction === "left" ? -200 : 0,
    y: direction === "bottom" ? 100 : direction === "top" ? -120 : 0,
  });

  // Update getOppositeHandle helper (new function)
  const getOppositeHandle = (direction: Direction) => {
    switch (direction) {
      case "left":
        return "right";
      case "right":
        return "left";
      case "top":
        return "bottom";
      case "bottom":
        return "top";
    }
  };

  const handleAddChildNode = useCallback(
    (parentNode: MindMapNode) => {
      const direction = determineWhichSideToAddChildNode(parentNode);

      logger.debug(`Adding child node to ${direction}`);
      const basePosition = getBasePosition(direction);
      const verticalSpace = parentNode.data.depth === 0 ? 80 : 5;

      // Find a free position for the new node using getIntersectingNodes
      const freePosition = findFreePosition(
        nodes,
        basePosition,
        verticalSpace,
        parentNode.id,
        getIntersectingNodes,
      );

      const newNode: MindMapNode = {
        id: crypto.randomUUID(),
        type: "rectangleShape",
        position: freePosition,
        data: {
          description: "",
          resourceType: "generic",
          textProperties: getDefaultTextProperties("generic"),
          isEditing: true,
          depth: (parentNode.data.depth || 0) + 1,
          lastDirection: direction, // Store the direction for future reference
        },
        selected: true,
        parentId: parentNode.id,
      };

      const newEdge: Edge = {
        id: `e-${parentNode.id}-${newNode.id}`,
        source: parentNode.id,
        target: newNode.id,
        sourceHandle: `${parentNode.id}-${direction}-source`,
        targetHandle: `${newNode.id}-${getOppositeHandle(direction)}-target`,
        type: "default",
      };

      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
      setEdges((eds) => [...eds, newEdge]);
      setSelectedNodeId(newNode.id);
      setSelectedNodeIds([newNode.id]);
    },
    [
      nodes,
      setNodes,
      setEdges,
      getIntersectingNodes,
      determineWhichSideToAddChildNode,
    ],
  );

  const handleTabKey = useCallback(() => {
    if (
      !selectedNode ||
      !selectedNodeId ||
      selectedNode?.data.isEditing ||
      selectedNode.type === "noteShape"
    )
      return;
    handleAddChildNode(selectedNode);
  }, [selectedNode, selectedNodeId, handleAddChildNode]);

  // Update handleAddSiblingNode to use the new direction logic
  const handleAddSiblingNode = useCallback(
    (siblingNode: MindMapNode) => {
      if (!siblingNode.parentId) return;

      const parentNode = nodes.find((n) => n.id === siblingNode.parentId);

      if (!parentNode) return;

      const direction = determineWhichSideToAddChildNode(parentNode);

      // Rest of the function remains similar but uses direction instead of boolean
      const basePosition = getBasePosition(direction);

      const verticalSpace = parentNode.data.depth === 0 ? 80 : 5;

      const freePosition = findFreePosition(
        nodes,
        basePosition,
        verticalSpace,
        parentNode.id,
        getIntersectingNodes,
      );

      const newNode: MindMapNode = {
        id: crypto.randomUUID(),
        type: "rectangleShape",
        position: freePosition,
        data: {
          description: "",
          resourceType: "generic",
          textProperties: getDefaultTextProperties("generic"),
          isEditing: true,
          depth: (parentNode.data.depth || 0) + 1,
        },
        selected: true,
        parentId: parentNode.id,
      };

      const newEdge: Edge = {
        id: `e-${parentNode.id}-${newNode.id}`,
        source: parentNode.id,
        target: newNode.id,
        sourceHandle: `${parentNode.id}-${direction}-source`,
        targetHandle: `${newNode.id}-${getOppositeHandle(direction)}-target`,
        type: "default",
      };

      setNodes((nds) => [
        ...nds.map((n) => ({ ...n, selected: false })),
        newNode,
      ]);
      setEdges((eds) => [...eds, newEdge]);
      setSelectedNodeId(newNode.id);
      setSelectedNodeIds([newNode.id]);
    },
    [
      nodes,
      setNodes,
      setEdges,
      getIntersectingNodes,
      determineWhichSideToAddChildNode,
    ],
  );

  // Update reactflow node creation to include these handlers
  const getNodeWithHandlers = useCallback(
    (node: MindMapNode) => ({
      ...node,
      data: {
        ...node.data,
        onAddChild: () => handleAddChildNode(node),
        onAddSibling: () => handleAddSiblingNode(node),
      },
    }),
    [handleAddChildNode, handleAddSiblingNode],
  );

  // Update the existing onNodesChange handler to include edge updates
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      // Apply node changes first
      onNodesChange(changes as NodeChange<MindMapNode>[]);

      // Check for position changes
      const positionChanges = changes.filter(
        (change) => change.type === "position" && change.dragging,
      );

      if (positionChanges.length > 0) {
        // Update edges for each moved node
        positionChanges.forEach((change) => {
          if (change.type === "position" && change.dragging === true) {
            setEdges((edges) => updateEdgeConnections(nodes, edges, change.id));
          }
        });
      }
    },
    [nodes, setEdges, onNodesChange],
  );

  useKeyboardShortcuts({
    onDelete: handleDeleteNodeOrEdge,
    onSearch: handleSearchFocus,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onTab: handleTabKey, // Add the new handler
    onEnter: handleEnterKey, // Add the new handler
    onArrowLeft: () => handleArrowNavigation("left"),
    onArrowRight: () => handleArrowNavigation("right"),
    onArrowUp: () => handleArrowNavigation("up"),
    onArrowDown: () => handleArrowNavigation("down"),
  });

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      <Menubar
        onCopyJsonToClipboard={copyJsonToClipboard}
        onNewProject={onNewProject}
      />
      <Toolbar
        onCopy={handleCopy}
        onDeleteNodeOrEdge={handleDeleteNodeOrEdge}
        onLoadMindMap={onLoadMindMap}
        onPaste={handlePaste}
        onSaveMindMap={onSaveMindMap}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        onToggleGrid={handleToggleGrid}
        onToggleProperties={() =>
          setIsPropertiesPanelVisible(!isPropertiesPanelVisible)
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 relative"
          onDoubleClick={() => handleNodeDoubleClick()}
        >
          <Canvas
            edges={edges}
            nodes={nodes.map(getNodeWithHandlers)}
            setEdges={setEdges}
            showGrid={showGrid} // Pass showGrid to Canvas
            onEdgeSelect={handleEdgeSelection}
            onEdgesChange={onEdgesChange}
            onNodeSelect={handleNodeSelection}
            onNodesChange={handleNodesChange} // Use the new handler here
          />
        </div>
        {isPropertiesPanelVisible && (
          <PropertiesPanel
            ref={propertiesPanelRef}
            selectedEdge={edges.find((edge) => edge.id === selectedEdgeId)}
            selectedNode={selectedNode}
            onEdgeAnimatedChange={handleEdgeAnimatedChange}
            onEdgeDirectionSwitch={handleEdgeDirectionSwitch}
            onEdgeLabelChange={handleEdgeLabelChange}
            onEdgeMarkerChange={handleEdgeMarkerChange}
            onNameChange={handleNodeNameChange}
            onTextPropertiesChange={handleTextPropertiesChange}
          />
        )}
      </div>
    </div>
  );
}
