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
import { PiArrowLineDownThin, PiArrowLineUpThin } from "react-icons/pi";

import rectangleNode from "./nodes/generic/rectangle-node";
import commentNode from "./nodes/generic/comment-node";
import noteNode from "./nodes/generic/note-node";
import textNode from "./nodes/generic/text-node";

import { DiagramElement } from "@/model/types";
import { logger } from "@/services/logger";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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
  rectangleShape: rectangleNode,
  textShape: textNode,
  noteShape: noteNode,
  commentShape: commentNode,
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
  const { setNodes, fitView } = useReactFlow();
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

  const onInit = useCallback((instance: ReactFlowInstance) => {
    fitView({ maxZoom: 1.0 });
  });

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

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: DiagramElement) => {
      logger.debug("Canvas: onNodeDoubleClick", node);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, data: { ...n.data, isEditing: true } } : n,
        ),
      );
    },
    [setNodes],
  );

  const handleSpacePress = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);

    if (selectedNodes.length === 1) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === selectedNodes[0].id
            ? { ...n, data: { ...n.data, isEditing: true } }
            : n,
        ),
      );
    }
  }, [nodes, setNodes]);

  const handleEscapePress = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) =>
        n.data.isEditing ? { ...n, data: { ...n.data, isEditing: false } } : n,
      ),
    );
  }, [setNodes]);

  useKeyboardShortcuts({
    onSpace: handleSpacePress,
    onEscape: handleEscapePress,
  });

  return (
    <div
      ref={canvasRef}
      className="w-full h-full border-0  relative bg-canvas-background"
      style={{ width: "100%", height: "100%" }}
      onDragOver={handleDragOver}
    >
      <ReactFlow
        snapToGrid
        defaultViewport={defaultViewport}
        disableKeyboardA11y={true}
        edges={edges}
        nodeTypes={nodeTypes}
        nodes={nodes} // <-- This is the key change. We're now using the nodes directly which include the callbacks
        proOptions={proOptions}
        selectionOnDrag={true}
        snapGrid={[10, 10]}
        onConnect={onConnect}
        onEdgesChange={onEdgesChange}
        onInit={onInit}
        onNodeContextMenu={onNodeContextMenu}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesChange={onNodesChange}
        onSelectionChange={onSelectionChange}
      >
        <Background
          color="#E8DDCB"
          gap={20}
          id="2"
          lineWidth={0.2}
          variant={BackgroundVariant.Lines}
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
