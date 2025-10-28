"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Edge,
  MarkerType,
  NodeChange,
  OnNodesChange,
  useEdgesState,
  useNodesState,
  useReactFlow,
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
import { GlobalSearchDialog } from "./global-search-dialog";
import { useMindMapGlobalSearch } from "./hooks/use-global-search";
import { useMindMapClipboard } from "./hooks/use-mindmap-clipboard";
import { useMindMapNodeCreation } from "./hooks/use-node-creation";
import { getDefaultTextProperties } from "./utils/text-properties";

import { useEditor } from "@/store/editor-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";
import { sampleData } from "@/model/example-data";
import {
  findClosestNodeInDirection,
  findFreePosition,
  getAbsolutePosition,
  recalculateAllEdgeConnections,
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
import { AutoLayoutMode, getAutoLayoutedNodes } from "@/utils/auto-layout";
import {
  CHILD_VERTICAL_SPACING,
  ROOT_VERTICAL_SPACING,
  OutlineItem,
  cleanNodesForStorage,
  getVerticalSpacingForDepth,
  parseOutlineText,
  updateSelectedNodeData,
} from "@/utils/editor-utils";

declare global {
  interface Window {
    __MINDMAPFLOW_BASE_TITLE__?: string;
  }
}

const initialNodes: MindMapNode[] = sampleData.nodes;
const initialEdges: Edge[] = sampleData.edges;
const rootNodeId = "root";

const NODE_HORIZONTAL_OFFSET = 240;
const DEFAULT_DOCUMENT_TITLE = "MindMapFlow";
const TITLE_CHANGE_EVENT = "mindmapflow:title-changed";

export default function Editor() {
  const searchParams = useSearchParams();
  const params = useParams();
  const showSample = searchParams?.get("showSample") === "true";
  const { isFullScreen, setIsFullScreen, setIsGlobalSearchActive } =
    useEditor();
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
  const [tags, setTags] = useState<string[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState(
    showSample ? initialNodes : [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    showSample ? initialEdges : [],
  );
  const [autoLayoutMode, setAutoLayoutMode] =
    useState<AutoLayoutMode>("horizontal");
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const propertiesPanelRef = useRef<PropertiesPanelHandle>(null);
  const { data: session } = useSession();
  const { loadMindMap } = useMindMap();
  const settingUpNewProject = useRef(false);
  const { palette, setPaletteId: setThemePaletteId } = useTheme();
  const paletteIdRef = useRef<string | undefined>(palette.id);
  const showGridRef = useRef(showGrid);

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
    showGrid,
    tags,
  );

  useEffect(() => {
    paletteIdRef.current = palette.id;
  }, [palette.id]);

  useEffect(() => {
    return () => {
      setIsGlobalSearchActive(false);
    };
  }, [setIsGlobalSearchActive]);

  useEffect(() => {
    showGridRef.current = showGrid;
  }, [showGrid]);

  const handleLoadMindMap = useCallback(async () => {
    if (!mindMapId) return;

    // Force clear unsaved changes state when explicitly loading a new mindmap
    setHasUnsavedChanges(false);
    setLastSavedState([], [], paletteIdRef.current, showGridRef.current, []);
    if (settingUpNewProject.current) {
      settingUpNewProject.current = false;
      logger.debug("Setting up new project, skipping load");

      return;
    }
    logger.debug("Loading mindmap in handleLoadMindMap", mindMapId);
    const data = await loadMindMap(mindMapId);

    if (data) {
      const loadedPaletteId = data.paletteId ?? DEFAULT_PALETTE_ID;
      const loadedShowGrid = data.showGrid ?? false;

      setThemePaletteId(loadedPaletteId);
      setNodes(data.nodes);
      setEdges(data.edges);
      setShowGrid(loadedShowGrid);
      setTags(data.tags ?? []);
      // Update last saved state with the newly loaded data
      setLastSavedState(
        data.nodes,
        data.edges,
        loadedPaletteId,
        loadedShowGrid,
        data.tags ?? [],
      );
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
    setShowGrid,
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

  const mindmapTitle = useMemo(() => {
    const rootNode =
      nodes.find((node) => node.id === rootNodeId) ||
      nodes.find((node) => (node.data?.depth ?? 0) === 0);

    if (!rootNode || !rootNode.data) {
      return undefined;
    }

    const candidate =
      rootNode.data.resourceName?.trim() ||
      rootNode.data.description?.trim() ||
      undefined;

    if (!candidate) {
      return undefined;
    }

    const normalized = candidate
      .split(/\r?\n/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .join(" ");

    return normalized.length > 0 ? normalized : undefined;
  }, [nodes]);

  const previousBaseTitleRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const baseTitle = mindmapTitle
      ? `${DEFAULT_DOCUMENT_TITLE} - ${mindmapTitle}`
      : DEFAULT_DOCUMENT_TITLE;

    if (previousBaseTitleRef.current === baseTitle) {
      // Ensure global state stays in sync even if title is unchanged
      window.__MINDMAPFLOW_BASE_TITLE__ = baseTitle;

      return;
    }

    previousBaseTitleRef.current = baseTitle;
    window.__MINDMAPFLOW_BASE_TITLE__ = baseTitle;
    document.title = baseTitle;
    window.dispatchEvent(
      new CustomEvent<string>(TITLE_CHANGE_EVENT, { detail: baseTitle }),
    );
  }, [mindmapTitle]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    return () => {
      window.__MINDMAPFLOW_BASE_TITLE__ = DEFAULT_DOCUMENT_TITLE;
      window.dispatchEvent(
        new CustomEvent<string>(TITLE_CHANGE_EVENT, {
          detail: DEFAULT_DOCUMENT_TITLE,
        }),
      );
    };
  }, []);

  const applySelection = useCallback(
    (
      nextSelectedIds: string[],
      options?: { primaryId?: string | null; edgeId?: string | null },
    ) => {
      const resolvedPrimary = (() => {
        if (typeof options?.primaryId === "string") {
          return nextSelectedIds.includes(options.primaryId)
            ? options.primaryId
            : null;
        }

        return nextSelectedIds.length === 1 ? nextSelectedIds[0] : null;
      })();

      const nextEdgeId = options?.edgeId ?? null;

      setSelectedNodeIds((prev) => {
        if (
          prev.length === nextSelectedIds.length &&
          prev.every((id, index) => id === nextSelectedIds[index])
        ) {
          return prev;
        }

        return nextSelectedIds;
      });

      setSelectedNodeId((prev) =>
        prev === resolvedPrimary ? prev : resolvedPrimary,
      );

      setSelectedEdgeId((prev) => (prev === nextEdgeId ? prev : nextEdgeId));

      setNodes((prev) => {
        let didChange = false;
        const nextSelectedSet = new Set(nextSelectedIds);

        const nextNodes = prev.map((node) => {
          const shouldSelect = nextSelectedSet.has(node.id);
          const wasSelected = Boolean(node.selected);
          const wasEditing = Boolean(node.data?.isEditing);
          const shouldExitEditing = wasEditing && !shouldSelect;

          if (wasSelected === shouldSelect && !shouldExitEditing) {
            return node;
          }

          didChange = true;

          if (shouldExitEditing && node.data) {
            const nextData = { ...node.data, isEditing: false };

            return {
              ...node,
              data: nextData,
              selected: shouldSelect,
            };
          }

          return {
            ...node,
            selected: shouldSelect,
          };
        });

        return didChange ? nextNodes : prev;
      });
    },
    [setNodes, setSelectedEdgeId, setSelectedNodeId, setSelectedNodeIds],
  );

  const {
    isGlobalSearchOpen,
    globalSearchQuery,
    globalSearchMatches,
    handleSearchFocus,
    handleGlobalSearchClose,
    handleGlobalSearchSubmit,
    handleGlobalSearchQueryChange,
  } = useMindMapGlobalSearch({
    nodes,
    selectedNodeIds,
    selectedNodeId,
    selectedEdgeId,
    applySelection,
    setIsGlobalSearchActive,
  });

  const { handleCopy, handlePaste } = useMindMapClipboard({
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedNodeIds,
  });

  const {
    handleAddChildNode,
    handleAddSiblingNode,
    handleAddNoteNode,
    handleTabKey,
  } = useMindMapNodeCreation({
    nodes,
    setNodes,
    setEdges,
    setSelectedNodeId,
    setSelectedNodeIds,
    setSelectedEdgeId,
    selectedNode,
    selectedNodeId,
    getEdges,
    getIntersectingNodes,
    getViewport,
    rootNodeId,
    markUnsaved: () => setHasUnsavedChanges(true),
  });

  const copyJsonToClipboard = () => {
    const cleanedNodes = cleanNodesForStorage(nodes);
    const project = {
      nodes: cleanedNodes,
      edges,
      showGrid,
      tags,
    };

    navigator.clipboard.writeText(JSON.stringify(project, null, 2));
    toast.success("Project copied to clipboard");
  };

  const handleProjectTagsChange = useCallback((nextTags: string[]) => {
    setTags(nextTags);
    setHasUnsavedChanges(true);
  }, []);

  const onNewProject = () => {
    logger.info("Creating new project");
    settingUpNewProject.current = true;
    const newMindMapId = nanoid(10);
    const emptyProject = mindMapService.createEmptyMindmap();
    const initialPaletteId = palette.id ?? DEFAULT_PALETTE_ID;
    const initialShowGrid = emptyProject.showGrid ?? false;

    setMindMapId(newMindMapId);
    setNodes(emptyProject.nodes as MindMapNode[]);
    setEdges(emptyProject.edges);
    setShowGrid(initialShowGrid);
    setTags(emptyProject.tags ?? []);
    window.history.pushState({}, "", `/editor/${newMindMapId}`);
    fitView({ padding: 100, maxZoom: 1.0, duration: 1500, minZoom: 1.0 });
    // Set hasUnsavedChanges to false since this is a fresh project
    setHasUnsavedChanges(false);
    setThemePaletteId(initialPaletteId);
    setLastSavedState(
      emptyProject.nodes as MindMapNode[],
      emptyProject.edges,
      initialPaletteId,
      initialShowGrid,
      emptyProject.tags ?? [],
    );
  };

  // Add handler for toggling grid visibility
  const handleToggleGrid = useCallback(() => {
    logger.info(`Toggling grid visibility to ${!showGrid}`);
    setShowGrid(!showGrid);
  }, [showGrid]);

  const handleAutoLayout = useCallback(
    (mode?: AutoLayoutMode) => {
      const effectiveMode = mode ?? autoLayoutMode;

      if (mode && mode !== autoLayoutMode) {
        setAutoLayoutMode(mode);
      }

      const layoutedNodes = getAutoLayoutedNodes(nodes, edges, {
        rootNodeId,
        horizontalOffset: NODE_HORIZONTAL_OFFSET,
        rootVerticalSpacing: ROOT_VERTICAL_SPACING,
        childVerticalSpacing: CHILD_VERTICAL_SPACING,
        mode: effectiveMode,
      });

      const hasNodeChanges = layoutedNodes.some(
        (node, index) => node !== nodes[index],
      );

      const updatedEdges = recalculateAllEdgeConnections(layoutedNodes, edges);
      const hasEdgeChanges = updatedEdges.some(
        (edge, index) => edge !== edges[index],
      );

      if (!hasNodeChanges && !hasEdgeChanges) {
        toast.info("Mindmap is already laid out");

        return;
      }

      if (hasNodeChanges) {
        setNodes(layoutedNodes);
      }

      if (hasEdgeChanges) {
        setEdges(updatedEdges);
      }

      setHasUnsavedChanges(true);
      toast.success("Auto layout applied");

      if (hasNodeChanges) {
        requestAnimationFrame(() => {
          fitView({ padding: 160, duration: 800, maxZoom: 1.0 });
        });
      }
    },
    [
      autoLayoutMode,
      edges,
      fitView,
      nodes,
      setHasUnsavedChanges,
      setEdges,
      setNodes,
    ],
  );

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

  const handleImportOutline = useCallback(
    (outline: string) => {
      if (!selectedNode || selectedNode.data.depth !== 0) {
        toast.error("Select the root node to import child nodes");

        return false;
      }

      const outlineItems = parseOutlineText(outline);

      if (outlineItems.length === 0) {
        toast.error("No bullet points detected in the outline");

        return false;
      }

      const newNodes: MindMapNode[] = [];
      const newEdges: Edge[] = [];
      const getAllNodes = () => [...nodes, ...newNodes];

      const createChildren = (
        items: OutlineItem[],
        parentId: string,
        parentDepth: number,
      ) => {
        if (items.length === 0) return;

        const siblings = getAllNodes().filter(
          (node) => node.parentId === parentId,
        );
        const spacing = getVerticalSpacingForDepth(parentDepth + 1);

        let yPositions: number[] = [];

        if (siblings.length === 0) {
          const centerOffset = ((items.length - 1) / 2) * spacing;

          yPositions = items.map((_, index) => index * spacing - centerOffset);
        } else {
          const existingPositions = siblings.map(
            (node) => node.position?.y ?? 0,
          );
          let currentY =
            existingPositions.length > 0
              ? Math.max(...existingPositions) + spacing
              : 0;

          yPositions = items.map((_, index) => {
            if (index === 0) return currentY;

            currentY += spacing;

            return currentY;
          });
        }

        items.forEach((item, index) => {
          const nodeId = crypto.randomUUID();
          const nodeDepth = parentDepth + 1;
          const positionY = yPositions[index] ?? 0;
          const defaultTextProps = getDefaultTextProperties("generic");

          const nodeData: MindMapNode["data"] = {
            resourceType: "generic",
            description: item.text,
            isEditing: false,
            depth: nodeDepth,
          };

          if (defaultTextProps) {
            nodeData.textProperties = defaultTextProps;
          }

          const newNode: MindMapNode = {
            id: nodeId,
            type: "rectangleShape",
            position: {
              x: NODE_HORIZONTAL_OFFSET,
              y: positionY,
            },
            data: nodeData,
            selected: false,
            parentId,
          };

          newNodes.push(newNode);

          newEdges.push({
            id: `e-${parentId}-${nodeId}`,
            source: parentId,
            target: nodeId,
            sourceHandle: `${parentId}-right-source`,
            targetHandle: `${nodeId}-left-target`,
            type: "default",
          });

          if (item.children.length > 0) {
            createChildren(item.children, nodeId, nodeDepth);
          }
        });
      };

      createChildren(
        outlineItems,
        selectedNode.id,
        selectedNode.data.depth ?? 0,
      );

      if (newNodes.length === 0) {
        toast.error("No bullet points detected in the outline");

        return false;
      }

      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);
      setSelectedNodeId(selectedNode.id);
      setSelectedNodeIds([selectedNode.id]);

      toast.success(
        `Imported ${newNodes.length} node${newNodes.length === 1 ? "" : "s"}`,
      );

      return true;
    },
    [
      nodes,
      selectedNode,
      setEdges,
      setNodes,
      setSelectedNodeId,
      setSelectedNodeIds,
    ],
  );

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

  const dispatchOpenLinkDialog = useCallback((nodeId: string) => {
    window.dispatchEvent(
      new CustomEvent("mindmapflow:open-link-dialog", {
        detail: { nodeId },
      }),
    );
  }, []);

  const handleOpenLinkDialogShortcut = useCallback(() => {
    if (!selectedNodeId) {
      toast.info("Select a node to add a link");

      return;
    }

    if (selectedNode?.data.resourceType === "Note") {
      toast.info("Links are not available for note nodes yet");

      return;
    }

    const trigger = () => dispatchOpenLinkDialog(selectedNodeId);

    if (isGlobalSearchOpen) {
      handleGlobalSearchClose();
      window.setTimeout(trigger, 0);

      return;
    }

    trigger();
  }, [
    dispatchOpenLinkDialog,
    handleGlobalSearchClose,
    isGlobalSearchOpen,
    selectedNode,
    selectedNodeId,
  ]);

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

  // Update reactflow node creation to include these handlers
  const getNodeWithHandlers = useCallback(
    (node: MindMapNode) => {
      const normalizedTags = Array.isArray(tags) ? tags : [];

      return {
        ...node,
        data: {
          ...node.data,
          ...(node.id === rootNodeId
            ? {
                projectTags: normalizedTags,
                onProjectTagsChange: handleProjectTagsChange,
              }
            : {}),
          onAddChild: () => handleAddChildNode(node),
          onAddSibling: () => handleAddSiblingNode(node),
        },
      };
    },
    [handleAddChildNode, handleAddSiblingNode, handleProjectTagsChange, tags],
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

  const clearSelection = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);

    setNodes((prevNodes) => {
      let didChange = false;

      const nextNodes = prevNodes.map((node) => {
        const shouldDeselect = node.selected;
        const shouldExitEditing = Boolean(node.data?.isEditing);

        if (!shouldDeselect && !shouldExitEditing) {
          return node;
        }

        didChange = true;

        return {
          ...node,
          ...(shouldDeselect ? { selected: false } : {}),
          data:
            shouldExitEditing && node.data
              ? { ...node.data, isEditing: false }
              : node.data,
        };
      });

      return didChange ? nextNodes : prevNodes;
    });

    setEdges((prevEdges) => {
      let didChange = false;

      const nextEdges = prevEdges.map((edge) => {
        if (!edge.selected) {
          return edge;
        }

        didChange = true;

        return { ...edge, selected: false };
      });

      return didChange ? nextEdges : prevEdges;
    });
  }, [
    setEdges,
    setNodes,
    setSelectedEdgeId,
    setSelectedNodeId,
    setSelectedNodeIds,
  ]);

  const handleEscapeKey = useCallback(() => {
    if (isGlobalSearchOpen) {
      handleGlobalSearchClose();

      return;
    }

    clearSelection();
  }, [clearSelection, handleGlobalSearchClose, isGlobalSearchOpen]);

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
    onAddNote: handleAddNoteNode,
    onEscape: handleEscapeKey,
    onOpenLinkDialog: handleOpenLinkDialogShortcut,
  });

  return (
    <div className="flex flex-col h-full flex-1 overflow-hidden">
      <GlobalSearchDialog
        matchCount={globalSearchMatches.length}
        open={isGlobalSearchOpen}
        query={globalSearchQuery}
        onClose={handleGlobalSearchClose}
        onQueryChange={handleGlobalSearchQueryChange}
        onSubmit={handleGlobalSearchSubmit}
      />
      <Menubar
        onClearSelection={clearSelection}
        onCopyJsonToClipboard={copyJsonToClipboard}
        onNewProject={onNewProject}
      />
      <Toolbar
        autoLayoutMode={autoLayoutMode}
        onAddNote={handleAddNoteNode}
        onAutoLayout={handleAutoLayout}
        onCopy={handleCopy}
        onDeleteNodeOrEdge={handleDeleteNodeOrEdge}
        onLoadMindMap={onLoadMindMap}
        onOpenSearch={handleSearchFocus}
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
            onImportOutline={handleImportOutline}
            onNameChange={handleNodeNameChange}
            onTextPropertiesChange={handleTextPropertiesChange}
          />
        )}
      </div>
    </div>
  );
}
