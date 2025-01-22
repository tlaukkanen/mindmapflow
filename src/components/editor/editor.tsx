"use client";

import { useState, useCallback, useRef } from "react";
import { Edge, Node, MarkerType, useEdgesState, useNodesState, useReactFlow } from "@xyflow/react";
import { toast } from "sonner";

import { PropertiesPanelHandle } from "./properties-panel";
import Canvas from "./canvas";
import PropertiesPanel from "./properties-panel";
import { Toolbar } from "./toolbar";
import { Menubar } from "./menubar";
import { TextProperties } from "./nodes/base-node";

import { useEditor } from "@/store/editor-context";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { DiagramElement, ResourceOption } from "@/model/types";
import { logger } from "@/services/logger";
import { sampleData } from "@/model/example-data";
import { ResourceNodeTypes } from "@/model/node-types";

const initialNodes: DiagramElement[] = sampleData.nodes;
const initialEdges: Edge[] = sampleData.edges;

// Add this helper function before the Editor component
const cleanNodesForStorage = (nodes: DiagramElement[]) => {
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
  nodes: DiagramElement[],
  selectedNodeId: string | null,
  updater: (data: any) => any,
) {
  if (!selectedNodeId) return nodes;

  return nodes.map((node) =>
    node.id === selectedNodeId ? { ...node, data: updater(node.data) } : node,
  );
}

// Abstracted local storage logic
function saveToLocalStorage(nodes: DiagramElement[], edges: Edge[]) {
  const cleanedNodes = cleanNodesForStorage(nodes);

  localStorage.setItem("nodes", JSON.stringify(cleanedNodes));
  localStorage.setItem("edges", JSON.stringify(edges));
}

function restoreFromLocalStorage() {
  const storedNodes = localStorage.getItem("nodes");
  const storedEdges = localStorage.getItem("edges");

  return {
    nodes: storedNodes ? JSON.parse(storedNodes) : [],
    edges: storedEdges ? JSON.parse(storedEdges) : [],
  };
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

// Add this utility function to get absolute position
const getAbsolutePosition = (
  node: DiagramElement,
  nodes: DiagramElement[],
): { x: number; y: number } => {
  const position = { x: node.position.x, y: node.position.y };
  let currentNode = node;

  // Traverse up the parent chain and accumulate positions
  while (currentNode.parentId) {
    const parent = nodes.find(n => n.id === currentNode.parentId);
    if (!parent) break;
    
    position.x += parent.position.x;
    position.y += parent.position.y;
    currentNode = parent;
  }

  return position;
};

const findFreePosition = (
  nodes: DiagramElement[],
  basePosition: { x: number; y: number },
  direction: 'horizontal' | 'vertical',
  spacing: number = 100,
  parentId: string | undefined,
  getIntersectingNodes: (node: Node) => Node[],
): { x: number; y: number } => {
  // If there's a parent, convert basePosition to absolute coordinates
  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
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
    id: 'temp',
    type: 'rectangleShape',
    position: basePosition,
    data: {},
    width: 100,
    height: 40,
  };

  let offset = 0;
  const position = { ...basePosition };
  tempNode.position = position;
  
  // Keep trying new positions until we find one with no intersections
  while (getIntersectingNodes(tempNode).length > 0) {
    offset += spacing;
    if (direction === 'horizontal') {
    position.y = basePosition.y + (offset * (offset % 2 === 0 ? 1 : -1));
    } else {
    position.x = basePosition.x + (offset * (offset % 2 === 0 ? 1 : -1));
    }
    tempNode.position = position;
  }

  // Convert back to relative position if there's a parent
  if (parentId) {
    const parent = nodes.find(n => n.id === parentId);
    if (parent) {
    const parentAbsPos = getAbsolutePosition(parent, nodes);
    return {
      x: position.x - parentAbsPos.x,
      y: position.y - parentAbsPos.y,
    };
    }
  }

  return position;
};

export default function Editor() {
  const { isFullScreen, setIsFullScreen } = useEditor();
  const [isPropertiesPanelVisible, setIsPropertiesPanelVisible] =
    useState(true);
  const [isResourcePanelVisible, setIsResourcePanelVisible] = useState(true);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const propertiesPanelRef = useRef<PropertiesPanelHandle>(null);
  const [copiedNodes, setCopiedNodes] = useState<DiagramElement[]>([]);
  const [pasteCount, setPasteCount] = useState(0);

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

    setNodes([]);
    setEdges([]);
  };

  const saveDiagram = () => {
    logger.info("Saving diagram to local storage");
    saveToLocalStorage(nodes, edges);
  };

  const onRestoreDiagram = () => {
    logger.info("Restoring diagram from local storage");
    const { nodes: savedNodes, edges: savedEdges } = restoreFromLocalStorage();

    setNodes(savedNodes);
    setEdges(savedEdges);
  };

  const handleNodeNameChange = (newName: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        resourceName: newName,
      })),
    );
  };

  const handleNodeSkuChange = (newSku: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        sku: newSku,
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

  const handleNodeDescriptionChange = (newDescription: string) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => ({
        ...data,
        description: newDescription,
      })),
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

  const handleResourceOptionChange = (
    optionName: string,
    value: string,
    show?: boolean,
  ) => {
    setNodes((prev) =>
      updateSelectedNodeData(prev, selectedNodeId, (data) => {
        const currentOptions = data.resourceOptions || [];
        const optionIndex = currentOptions.findIndex(
          (opt: ResourceOption) => opt.name === optionName,
        );

        const newOptions =
          optionIndex >= 0
            ? currentOptions.map((opt: ResourceOption, i: number) =>
                i === optionIndex
                  ? { ...opt, value, show: show ?? opt.show }
                  : opt,
              )
            : [
                ...currentOptions,
                { name: optionName, value, show: show ?? false },
              ];

        return {
          ...data,
          resourceOptions: newOptions,
        };
      }),
    );
  };

  const handleNodeSelection = useCallback((nodes: DiagramElement[]) => {
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
      setNodes((nodes) =>
        nodes.filter((node) => !selectedNodeIds.includes(node.id)),
      );
      setSelectedNodeIds([]);
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      logger.info("Deleting edge", selectedEdgeId);
      setEdges((edges) => edges.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }, [selectedNodeIds, selectedEdgeId, setNodes, setEdges]);

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

    const newNodes = copiedNodes.map((node) => ({
      ...node,
      id: crypto.randomUUID(),
      position: {
        x: node.position.x + 20 * (pasteCount + 1),
        y: node.position.y + 20 * (pasteCount + 1),
      },
      selected: true,
    }));

    setNodes((prev) => [...prev, ...newNodes]);
    setPasteCount((count) => count + 1);
    toast.success(
      `Pasted ${newNodes.length} node${newNodes.length > 1 ? "s" : ""}`,
    );
  }, [copiedNodes, setNodes, pasteCount]);

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

  const { getIntersectingNodes } = useReactFlow();

  const handleTabKey = useCallback(() => {
    if (!selectedNode || !selectedNodeId || selectedNode?.data.isEditing) return;
  
    const rootNode = nodes.find(node => !node.parentId);
    if (!rootNode) return;
  
    const isSelectedNodeRoot = selectedNode.id === rootNode.id;
    const selectedNodePosition = selectedNode.position;
    const rootPosition = rootNode.position;
    const shouldAddToRight = isSelectedNodeRoot || selectedNodePosition.x > rootPosition.x;
  
    const basePosition = {
      x: shouldAddToRight ? 200 : -200,
      y: 0,
    };

    // Find a free position for the new node using getIntersectingNodes
    const freePosition = findFreePosition(
      nodes,
      basePosition,
      'horizontal',
      100,
      selectedNodeId,
      getIntersectingNodes
    );

    const newNode: DiagramElement = {
      id: crypto.randomUUID(),
      type: 'rectangleShape',
      position: freePosition,
      data: {
        description: '',
        resourceType: 'generic',
        textProperties: getDefaultTextProperties('generic'),
        isEditing: true,
      },
      width: 100,
      height: 40,
      selected: true,
      parentId: selectedNodeId,
    };

    // Create edge between selected node and new node with proper handles
    const newEdge: Edge = {
      id: `e-${selectedNodeId}-${newNode.id}`,
      source: selectedNodeId,
      target: newNode.id,
      sourceHandle: shouldAddToRight ? `${selectedNodeId}-right-source` : `${selectedNodeId}-left-source`,
      targetHandle: shouldAddToRight ? `${newNode.id}-left-target` : `${newNode.id}-right-target`,
      type: 'default',
    };
  
    // Update nodes and edges
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setEdges((eds) => [...eds, newEdge]);
  
    // Set the new node as selected
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  }, [selectedNodeId, selectedNode, nodes, setNodes, setEdges, getIntersectingNodes]);
  
  const handleEnterKey = useCallback(() => {
    if (!selectedNode || !selectedNodeId || selectedNode?.data.isEditing) return;

    const rootNode = nodes.find(node => !node.parentId);
    if (!rootNode) return;

    const parentNode = nodes.find(node => node.id === selectedNode.parentId);
    const parentNodeId = parentNode?.id;
    
    const selectedNodePosition = selectedNode.position;
    const rootPosition = rootNode.position;
    const shouldAddAbove = selectedNodePosition.y > rootPosition.y;

    const basePosition = {
      x: 0,
      y: shouldAddAbove ? -100 : 100,
    };

    // Find a free position for the new node using getIntersectingNodes
    const freePosition = findFreePosition(
      nodes,
      basePosition,
      'vertical',
      100,
      parentNodeId,
      getIntersectingNodes
    );

    const newNode: DiagramElement = {
      id: crypto.randomUUID(),
      type: 'rectangleShape',
      position: freePosition,
      data: {
        description: '',
        resourceType: 'generic',
        textProperties: getDefaultTextProperties('generic'),
        isEditing: true,
      },
      width: 100,
      height: 40,
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
        sourceHandle: `${parentNodeId}-right-source`,
        targetHandle: `${newNode.id}-left-target`,
        type: 'default',
      };
      newEdges.push(newEdge);
    }

    // Update nodes and edges
    setNodes((nds) => [...nds.map(n => ({ ...n, selected: false })), newNode]);
    setEdges(newEdges);

    // Set the new node as selected
    setSelectedNodeId(newNode.id);
    setSelectedNodeIds([newNode.id]);
  }, [selectedNodeId, selectedNode, nodes, edges, setNodes, setEdges, getIntersectingNodes]);

  useKeyboardShortcuts({
    onDelete: handleDeleteNodeOrEdge,
    onSearch: handleSearchFocus,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onTab: handleTabKey,  // Add the new handler
    onEnter: handleEnterKey,  // Add the new handler
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
        onPaste={handlePaste}
        onRestoreDiagram={onRestoreDiagram}
        onSaveDiagram={saveDiagram}
        onToggleFullScreen={() => setIsFullScreen(!isFullScreen)}
        onToggleProperties={() =>
          setIsPropertiesPanelVisible(!isPropertiesPanelVisible)
        }
        onToggleResources={() =>
          setIsResourcePanelVisible(!isResourcePanelVisible)
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 relative"
          onDoubleClick={() => handleNodeDoubleClick()}
        >
          <Canvas
            edges={edges}
            nodes={nodes}
            setEdges={setEdges}
            onEdgeSelect={handleEdgeSelection}
            onEdgesChange={onEdgesChange}
            onNodeSelect={handleNodeSelection}
            onNodesChange={onNodesChange}
          />
        </div>
        {isPropertiesPanelVisible && (
          <PropertiesPanel
            ref={propertiesPanelRef}
            selectedEdge={edges.find((edge) => edge.id === selectedEdgeId)}
            selectedNode={selectedNode}
            onDescriptionChange={handleNodeDescriptionChange}
            onEdgeAnimatedChange={handleEdgeAnimatedChange}
            onEdgeDirectionSwitch={handleEdgeDirectionSwitch}
            onEdgeLabelChange={handleEdgeLabelChange}
            onEdgeMarkerChange={handleEdgeMarkerChange}
            onNameChange={handleNodeNameChange}
            onResourceOptionChange={handleResourceOptionChange}
            onSkuChange={handleNodeSkuChange}
            onTextPropertiesChange={handleTextPropertiesChange}
          />
        )}
      </div>
    </div>
  );
}
