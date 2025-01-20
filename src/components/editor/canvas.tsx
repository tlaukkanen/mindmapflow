"use client";

import React, { useCallback, useRef } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  NodeTypes,
  addEdge,
  OnNodesChange,
  OnSelectionChangeParams,
  Connection,
  Edge,
  OnEdgesChange,
  useReactFlow,
} from "@xyflow/react";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { toast } from "sonner";
import { PiArrowLineDownThin, PiArrowLineUpThin } from "react-icons/pi";

import rectangleNode from "./nodes/generic/rectangle-node";
import commentNode from "./nodes/generic/comment-node";
import noteNode from "./nodes/generic/note-node";
import textNode from "./nodes/generic/text-node";

import { DiagramElement } from "@/model/types";
import { logger } from "@/services/logger";
import { IconService } from "@/services/icon-service";
import { getDefaultTextProperties } from "@/components/editor/editor";
import { DiagramComponent, ResourceNodeTypes } from "@/model/node-types";

declare global {
  interface Window {
    dragData?: {
      resource: string;
      iconName: string;
      nodeType: string;
      backgroundColor: string;
      sourceElement: HTMLElement;
      offset: { x: number; y: number };
    };
  }
}

interface CanvasProps {
  nodes: DiagramElement[];
  edges: Edge[];
  setEdges: (edges: Edge[]) => void;
  onNodeSelect: (nodes: DiagramElement[]) => void; // Changed from (node: DiagramElement | null) => void
  onEdgeSelect: (edge: Edge | null) => void;
  onNodesChange: OnNodesChange<DiagramElement>;
  onEdgesChange: OnEdgesChange<Edge>;
}

const nodeTypes: NodeTypes = {
  // Shapes
  rectangleShape: rectangleNode,
  usersShape: iconNode,
  emailShape: iconNode,
  phoneShape: iconNode,
  documentShape: iconNode,

  // Annotations
  textShape: textNode,
  noteShape: noteNode,
  commentShape: commentNode,

  // Azure
  azureResource: AzureResourceNode,
  azureResourceCollection: azureResourceCollection,
};

const proOptions = { hideAttribution: true };

const defaultViewport = { x: 0, y: 0, zoom: 1.0 };

export default function Canvas({
  nodes,
  edges,
  setEdges,
  onNodeSelect,
  onEdgeSelect,
  onNodesChange,
  onEdgesChange,
}: CanvasProps) {
  const { setNodes } = useReactFlow();
  const [isContextMenuOpen, setIsContextMenuOpen] = React.useState(false);
  const [contextMenuNode, setContextMenuNode] =
    React.useState<DiagramElement | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = React.useState({
    x: 0,
    y: 0,
  });
  const { screenToFlowPosition } = useReactFlow();

  // Move onSelectionChange up with other callbacks
  const onSelectionChange = useCallback(
    ({
      nodes: selectedNodes,
      edges: selectedEdges,
    }: OnSelectionChangeParams) => {
      if (selectedEdges.length === 0) {
        onEdgeSelect(null);
      } else if (selectedEdges.length > 0) {
        const selectedEdge = selectedEdges[0] as Edge;

        //logger.debug("(Canvas) Selected edge:", selectedEdge);
        onEdgeSelect(selectedEdge || null);
      }

      // Update this part to handle multiple node selection
      const diagramNodes = selectedNodes as DiagramElement[];

      onNodeSelect(diagramNodes);
    },
    [onNodeSelect, onEdgeSelect],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      logger.debug("(Canvas) Connecting nodes", params);
      const newEdge: Edge = {
        ...params,
        animated: false,
        id: `e-${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}-${crypto.randomUUID()}`,
        selected: true,
      };
      const newEdges = addEdge(newEdge, [
        ...edges.map((edge) => ({ ...edge, selected: false })),
      ]);

      setEdges(newEdges);
    },
    [edges, setEdges],
  );

  const canvasRef = useRef<HTMLDivElement>(null);

  const findParentNode = useCallback(
    (dropPosition: { x: number; y: number }, excludeNodeId?: string) => {
      const containingNodes = nodes.filter((node) => {
        // Skip the node that triggered the search
        if (excludeNodeId && node.id === excludeNodeId) return false;

        const nodeElement = document.querySelector(`[data-id="${node.id}"]`);

        if (!nodeElement || !canvasRef.current) return false;

        const nodeRect = nodeElement.getBoundingClientRect();
        const canvasRect = canvasRef.current.getBoundingClientRect();

        // Convert drop position to be relative to canvas
        const relativeX = dropPosition.x;
        const relativeY = dropPosition.y;

        // Convert node position to be relative to canvas
        const nodePos = {
          x: nodeRect.x - canvasRect.x,
          y: nodeRect.y - canvasRect.y,
        };

        const isContained =
          relativeX >= nodePos.x &&
          relativeX <= nodePos.x + nodeRect.width &&
          relativeY >= nodePos.y &&
          relativeY <= nodePos.y + nodeRect.height;

        // Debug logging
        logger.debug("Node check:", {
          nodeId: node.id,
          nodeType: node.type,
          dropPos: { x: relativeX, y: relativeY },
          nodePos,
          nodeRect: {
            width: nodeRect.width,
            height: nodeRect.height,
          },
          isContained,
        });

        return isContained;
      });

      if (containingNodes.length === 0) return undefined;

      // Sort nodes by nesting level
      const sortedNodes = containingNodes.sort((a, b) => {
        const getDepth = (node: DiagramElement): number => {
          let depth = 0;
          let current = node;

          while (current.parentId) {
            depth++;
            current = nodes.find(
              (n) => n.id === current.parentId,
            ) as DiagramElement;
          }

          return depth;
        };

        return getDepth(b) - getDepth(a);
      });

      // Debug the result
      logger.debug("Found parent node:", sortedNodes[0]);

      return sortedNodes[0];
    },
    [nodes],
  );

  const getRelativePosition = useCallback(
    (position: { x: number; y: number }, parentNode?: DiagramElement) => {
      if (!canvasRef.current) {
        return position; // or a safe fallback, e.g. { x: 0, y: 0 }
      }

      if (!parentNode || !canvasRef.current) return position;

      const parentElement = document.querySelector(
        `[data-id="${parentNode.id}"]`,
      );

      if (!parentElement) return position;

      const parentRect = parentElement.getBoundingClientRect();
      const canvasRect = canvasRef.current.getBoundingClientRect();

      // Calculate position relative to parent's top-left corner
      return {
        x: position.x - (parentRect.left - canvasRect.left),
        y: position.y - (parentRect.top - canvasRect.top),
      };
    },
    [],
  );

  const createNewElement = useCallback(
    (params: {
      position: { x: number; y: number };
      nodeType: string;
      resourceType: string;
      iconName: string;
      backgroundColor: string;
    }) => {
      const parentNode = findParentNode(params.position);
      const position = getRelativePosition(params.position, parentNode);

      // Get default text properties for this resource type
      const defaultTextProperties = getDefaultTextProperties(
        params.resourceType,
      );

      // Find the resource definition in node-types.ts
      const resourceDefinition = ResourceNodeTypes.find(
        (component: DiagramComponent) => component.name === params.resourceType,
      );

      const newElement: DiagramElement = {
        id: crypto.randomUUID(),
        type: params.nodeType,
        position,
        data: {
          resourceType: params.resourceType,
          iconName: params.iconName,
          backgroundColor: params.backgroundColor,
          resourceName: "",
          textProperties: defaultTextProperties,
          showFrame: resourceDefinition?.showFrame, // Use the definition from node-types.ts
        },
        style: {
          width: params.nodeType === "azureResource" ? 180 : 200,
          height: params.nodeType === "azureResource" ? 40 : 90,
        },
        selected: true,
        parentId: parentNode?.id,
      };

      if (parentNode?.type === "azureResourceCollection") {
        (newElement as any).extent = "parent";
      }

      setNodes([
        ...nodes.map((node) => ({ ...node, selected: false })),
        newElement,
      ]);
    },
    [nodes, findParentNode, setNodes, getRelativePosition],
  );

  const handleElementCreation = useCallback(
    (params: {
      clientX: number;
      clientY: number;
      nodeType: string;
      resource: string;
      iconName: string;
      backgroundColor: string;
    }) => {
      if (!canvasRef.current) return;

      const dropPositionOnFlowCanvas = screenToFlowPosition({
        x: params.clientX,
        y: params.clientY,
      });

      const nodeWidth = params.nodeType === "azureResource" ? 180 : 200;
      const nodeHeight = params.nodeType === "azureResource" ? 40 : 90;

      createNewElement({
        position: {
          x: dropPositionOnFlowCanvas.x - nodeWidth / 2,
          y: dropPositionOnFlowCanvas.y - nodeHeight / 2,
        },
        nodeType: params.nodeType,
        resourceType: params.resource,
        iconName: params.iconName,
        backgroundColor: params.backgroundColor,
      });
    },
    [createNewElement, screenToFlowPosition],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) return;

    const IconComponent = IconService.getIconComponent(
      e.dataTransfer.getData("iconName"),
    );

    if (!IconComponent) {
      toast.error(`Icon not found for ${e.dataTransfer.getData("iconName")}`);

      return;
    }

    handleElementCreation({
      clientX: e.clientX,
      clientY: e.clientY,
      nodeType: e.dataTransfer.getData("nodeType"),
      resource: e.dataTransfer.getData("resource"),
      iconName: e.dataTransfer.getData("iconName") ?? "",
      backgroundColor: e.dataTransfer.getData("backgroundColor"),
    });
  };

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const dragData = window.dragData;

      if (!dragData || !canvasRef.current) return;

      e.preventDefault();
      e.stopPropagation();
      cleanupDragPreview();

      const touch = e.changedTouches[0];
      const rect = canvasRef.current.getBoundingClientRect();
      const position = {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };

      if (
        position.x < 0 ||
        position.y < 0 ||
        position.x > rect.width ||
        position.y > rect.height
      ) {
        logger.debug("Touch ended outside canvas - ignoring");
        toast.error("Touch ended outside canvas - ignoring");
        window.dragData = undefined;

        return;
      }

      handleElementCreation({
        clientX: touch.clientX,
        clientY: touch.clientY,
        nodeType: dragData.nodeType,
        resource: dragData.resource,
        iconName: dragData.iconName,
        backgroundColor: dragData.backgroundColor,
      });

      window.dragData = undefined;
    },
    [handleElementCreation],
  );

  const updateNodeParenting = useCallback(
    (nodeToUpdate: DiagramElement, position: { x: number; y: number }) => {
      if (!canvasRef.current) {
        return; // safely return if no canvas ref
      }

      const parentNode = findParentNode(position, nodeToUpdate.id);
      let updatedNode = { ...nodeToUpdate };

      logger.debug("Checking parenting for node:", nodeToUpdate);

      // Update position based on parent
      if (
        parentNode &&
        (parentNode.id === nodeToUpdate.parentId ||
          parentNode.id === nodeToUpdate.id)
      ) {
        logger.debug("Parent is the same as the current parent");
      } else if (parentNode) {
        logger.debug("Parent found, updating position:", parentNode);
        updatedNode.position = getRelativePosition(position, parentNode);
        updatedNode.parentId = parentNode.id;
        if (parentNode.type === "azureResourceCollection") {
          (updatedNode as any).extent = "parent";
        }
      } else {
        // If no parent found, remove parent reference
        if (nodeToUpdate.parentId) {
          logger.debug("No parent found, clearing parent reference");
          updatedNode.parentId = undefined;
          updatedNode.extent = undefined;
          // Reset position to the drop position
          updatedNode.position = position;
        }
      }

      // Collect node updates in a Map
      const nodeUpdates = new Map<string, DiagramElement>();

      // Put the dragged node in the map
      nodes.forEach((node) => {
        if (node.id === nodeToUpdate.id) {
          nodeUpdates.set(node.id, updatedNode);
        } else {
          nodeUpdates.set(node.id, node);
        }
      });

      // Helper function to get all ancestors of a node
      const getAncestors = (nodeId: string): string[] => {
        const node = nodeUpdates.get(nodeId);

        if (!node?.parentId) return [];

        return [node.parentId, ...getAncestors(node.parentId)];
      };

      // Identify direct children inside the bounding box
      const childNodes = nodes.filter((node) => {
        if (node.id === nodeToUpdate.id) return false;

        const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
        const draggedElement = document.querySelector(
          `[data-id="${nodeToUpdate.id}"]`,
        );

        if (!nodeElement || !draggedElement || !canvasRef.current) return false;

        const nodeRect = nodeElement.getBoundingClientRect();
        const draggedRect = draggedElement.getBoundingClientRect();

        return (
          nodeRect.left >= draggedRect.left &&
          nodeRect.right <= draggedRect.right &&
          nodeRect.top >= draggedRect.top &&
          nodeRect.bottom <= draggedRect.bottom
        );
      });

      // Re-parent only direct children that are not already in the sub-hierarchy
      childNodes.forEach((child) => {
        const ancestors = getAncestors(child.id);

        if (
          !ancestors.includes(nodeToUpdate.id) &&
          child.parentId !== nodeToUpdate.id
        ) {
          const childElement = document.querySelector(
            `[data-id="${child.id}"]`,
          );

          if (childElement && canvasRef.current) {
            const childRect = childElement.getBoundingClientRect();
            const canvasRect = canvasRef.current.getBoundingClientRect();
            const childAbsolutePosition = {
              x: childRect.left - canvasRect.left,
              y: childRect.top - canvasRect.top,
            };
            const relativePosition = getRelativePosition(
              childAbsolutePosition,
              updatedNode,
            );

            nodeUpdates.set(child.id, {
              ...child,
              parentId: nodeToUpdate.id,
              position: relativePosition,
              extent:
                nodeToUpdate.type === "azureResourceCollection"
                  ? "parent"
                  : undefined,
            });
          }
        }
      });

      // Sort updated nodes so parents come before children
      const sortedNodes = Array.from(nodeUpdates.values()).sort((a, b) => {
        const aAncestors = getAncestors(a.id);
        const bAncestors = getAncestors(b.id);

        if (bAncestors.includes(a.id)) return -1;
        if (aAncestors.includes(b.id)) return 1;

        return 0;
      });

      // Make sure parents appear before children
      const reorderedNodes = [...sortedNodes];

      reorderedNodes.forEach((child, idx) => {
        if (child.parentId) {
          const parentIndex = reorderedNodes.findIndex(
            (n) => n.id === child.parentId,
          );

          if (parentIndex > idx) {
            // Move parent ahead of child
            const [parentNode] = reorderedNodes.splice(parentIndex, 1);

            reorderedNodes.splice(idx, 0, parentNode);
          }
        }
      });

      setNodes(reorderedNodes);
    },
    [nodes, findParentNode, setNodes, getRelativePosition],
  );

  const onNodeDragStop = useCallback(
    (e: React.MouseEvent, node: DiagramElement) => {
      logger.debug("Node drag stop", node);
      const canvasRect = canvasRef.current?.getBoundingClientRect();

      if (!canvasRect) return;

      // Get flow position from screen position
      const dropPositionOnFlowCanvas = screenToFlowPosition({
        x: e.clientX,
        y: e.clientY,
      });

      updateNodeParenting(node, dropPositionOnFlowCanvas);
    },
    [updateNodeParenting],
  );

  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: DiagramElement) => {
      function getChildren(nodeId: string): DiagramElement[] {
        const directChildren = nodes.filter((n) => n.parentId === nodeId);

        return directChildren.flatMap((child) => [
          child,
          ...getChildren(child.id),
        ]);
      }

      const draggedNodeAndChildren = [node, ...getChildren(node.id)];
      const remainingNodes = nodes.filter(
        (existing) =>
          !draggedNodeAndChildren.some((dc) => dc.id === existing.id),
      );

      setNodes([...remainingNodes, ...draggedNodeAndChildren]);
    },
    [nodes, setNodes],
  );

  // Move touch handlers setup to useEffect
  React.useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) return;

    /*
    const touchMoveHandler = (e: TouchEvent) => {
      if (window.dragData) {
        e.preventDefault();
      }
    };
    */

    const touchEndHandler = (e: TouchEvent) => {
      // Only handle if we have drag data
      if (!window.dragData) return;

      handleTouchEnd(e);
    };

    // Add listeners to both canvas and document body
    //canvas.addEventListener("touchmove", touchMoveHandler, { passive: false });
    canvas.addEventListener("touchend", touchEndHandler);
    document.body.addEventListener("touchend", touchEndHandler);

    return () => {
      //canvas.removeEventListener("touchmove", touchMoveHandler);
      canvas.removeEventListener("touchend", touchEndHandler);
      document.body.removeEventListener("touchend", touchEndHandler);
    };
  }, [handleTouchEnd]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: DiagramElement) => {
      logger.debug("Node context menu:", node);
      logger.debug("Context menu mouse event:", event);
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuNode(node);
      setIsContextMenuOpen(true);
      event.preventDefault();
    },
    [contextMenuPosition, isContextMenuOpen, nodes],
  );

  const moveNodeToBack = useCallback(() => {
    if (!contextMenuNode) return;

    const nodeIndex = nodes.findIndex((node) => node.id === contextMenuNode.id);

    if (nodeIndex === -1) return;

    const updatedNodes = [...nodes];
    const [movedNode] = updatedNodes.splice(nodeIndex, 1);

    updatedNodes.unshift(movedNode);

    setNodes(updatedNodes);
    setIsContextMenuOpen(false);
  }, [contextMenuNode, nodes, setNodes]);

  const moveNodeToFront = useCallback(() => {
    if (!contextMenuNode) return;

    const nodeIndex = nodes.findIndex((node) => node.id === contextMenuNode.id);

    if (nodeIndex === -1) return;

    const updatedNodes = [...nodes];
    const [movedNode] = updatedNodes.splice(nodeIndex, 1);

    updatedNodes.push(movedNode);

    setNodes(updatedNodes);
    setIsContextMenuOpen(false);
  }, [contextMenuNode, nodes, setNodes]);

  const handleContextMenuClose = () => {
    setIsContextMenuOpen(false);
    setContextMenuNode(null);
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full border-0  relative bg-canvas-background"
      style={{ width: "100%", height: "100%" }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        snapToGrid
        defaultViewport={defaultViewport}
        edges={edges}
        nodeTypes={nodeTypes}
        nodes={nodes}
        proOptions={proOptions}
        selectionOnDrag={true}
        snapGrid={[10, 10]}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
      >
        <Background
          color="#aaaaaa"
          gap={20}
          id="2"
          lineWidth={0.2}
          variant={BackgroundVariant.Dots}
        />
        <Controls />
      </ReactFlow>
      <Menu
        anchorPosition={{
          top: contextMenuPosition.y,
          left: contextMenuPosition.x,
        }}
        anchorReference="anchorPosition"
        className="text-xs"
        open={isContextMenuOpen}
        onClose={handleContextMenuClose}
      >
        <MenuItem onClick={moveNodeToBack}>
          <ListItemIcon>
            <PiArrowLineDownThin />
          </ListItemIcon>
          <ListItemText className="text-xs">Move to back</ListItemText>
        </MenuItem>
        <MenuItem onClick={moveNodeToFront}>
          <ListItemIcon>
            <PiArrowLineUpThin />
          </ListItemIcon>
          <ListItemText className="text-xs">Move to front</ListItemText>
        </MenuItem>
      </Menu>
    </div>
  );
}
