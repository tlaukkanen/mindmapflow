import { Dispatch, SetStateAction, useCallback } from "react";
import { Edge, Node, Viewport } from "@xyflow/react";

import { getDefaultTextProperties } from "../utils/text-properties";

import { MindMapNode } from "@/model/types";
import {
  determinePreferredDirection,
  findFreePosition,
  getAbsolutePosition,
  getBasePositionForDirection,
  getOppositeDirection,
} from "@/utils/node-utils";
import { logger } from "@/services/logger";

interface UseMindMapNodeCreationArgs {
  nodes: MindMapNode[];
  setNodes: Dispatch<SetStateAction<MindMapNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  selectedNode: MindMapNode | undefined;
  selectedNodeId: string | null;
  getEdges: () => Edge[];
  getIntersectingNodes: (node: Node) => Node[];
  getViewport: () => Viewport;
  rootNodeId: string;
  markUnsaved: () => void;
}

const NOTE_WIDTH = 220;
const NOTE_HEIGHT = 140;
const NOTE_GAP_Y = 24;

export const useMindMapNodeCreation = ({
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
  markUnsaved,
}: UseMindMapNodeCreationArgs) => {
  const determineChildDirection = useCallback(
    (parentNode: MindMapNode) =>
      determinePreferredDirection(parentNode, getEdges(), rootNodeId),
    [getEdges, rootNodeId],
  );

  const createChildNodeWithEdge = useCallback(
    (parentNode: MindMapNode) => {
      const direction = determineChildDirection(parentNode);

      logger.debug(`Adding child node to ${direction}`);
      const basePosition = getBasePositionForDirection(direction);
      const verticalSpace = parentNode.data.depth === 0 ? 80 : 5;

      const freePosition = findFreePosition(
        nodes,
        basePosition,
        verticalSpace,
        parentNode.id,
        getIntersectingNodes,
      );

      const defaultTextProps = getDefaultTextProperties("generic");

      const nodeData: MindMapNode["data"] = {
        description: "",
        resourceType: "generic",
        textProperties: defaultTextProps,
        isEditing: true,
        depth: (parentNode.data.depth || 0) + 1,
        lastDirection: direction,
      };

      const newNode: MindMapNode = {
        id: crypto.randomUUID(),
        type: "rectangleShape",
        position: freePosition,
        data: nodeData,
        selected: true,
        parentId: parentNode.id,
      };

      const newEdge: Edge = {
        id: `e-${parentNode.id}-${newNode.id}`,
        source: parentNode.id,
        target: newNode.id,
        sourceHandle: `${parentNode.id}-${direction}-source`,
        targetHandle: `${newNode.id}-${getOppositeDirection(direction)}-target`,
        type: "default",
      };

      return { newNode, newEdge };
    },
    [determineChildDirection, getIntersectingNodes, nodes],
  );

  const handleAddChildNode = useCallback(
    (parentNode: MindMapNode) => {
      const { newNode, newEdge } = createChildNodeWithEdge(parentNode);

      setNodes((prev) => [
        ...prev.map((node) => ({ ...node, selected: false })),
        newNode,
      ]);
      setEdges((prev) => [...prev, newEdge]);
      setSelectedNodeId(newNode.id);
      setSelectedNodeIds([newNode.id]);
    },
    [
      createChildNodeWithEdge,
      setEdges,
      setNodes,
      setSelectedNodeId,
      setSelectedNodeIds,
    ],
  );

  const handleAddSiblingNode = useCallback(
    (siblingNode: MindMapNode) => {
      if (!siblingNode.parentId) return;

      const parentNode = nodes.find((node) => node.id === siblingNode.parentId);

      if (!parentNode) return;

      const { newNode, newEdge } = createChildNodeWithEdge(parentNode);

      setNodes((prev) => [
        ...prev.map((node) => ({ ...node, selected: false })),
        newNode,
      ]);
      setEdges((prev) => [...prev, newEdge]);
      setSelectedNodeId(newNode.id);
      setSelectedNodeIds([newNode.id]);
    },
    [
      createChildNodeWithEdge,
      nodes,
      setEdges,
      setNodes,
      setSelectedNodeId,
      setSelectedNodeIds,
    ],
  );

  const handleAddNoteNode = useCallback(() => {
    const defaultTextProps = getDefaultTextProperties("Note");
    const newNoteId = crypto.randomUUID();

    let parentId: string | undefined;
    let resolvedPosition = { x: 0, y: 0 };

    if (selectedNode) {
      const selectedAbsolute = getAbsolutePosition(selectedNode, nodes);
      const selectedWidth =
        typeof selectedNode.width === "number"
          ? selectedNode.width
          : typeof selectedNode.style?.width === "number"
            ? selectedNode.style.width
            : NOTE_WIDTH;
      const noteAbsolute = {
        x: selectedAbsolute.x + (selectedWidth - NOTE_WIDTH) / 2,
        y: selectedAbsolute.y - NOTE_HEIGHT - NOTE_GAP_Y,
      };

      parentId = selectedNode.parentId;

      if (parentId) {
        const parentNode = nodes.find((n) => n.id === parentId);

        if (parentNode) {
          const parentAbsolute = getAbsolutePosition(parentNode, nodes);

          resolvedPosition = {
            x: noteAbsolute.x - parentAbsolute.x,
            y: noteAbsolute.y - parentAbsolute.y,
          };
        } else {
          parentId = undefined;
          resolvedPosition = noteAbsolute;
        }
      } else {
        resolvedPosition = noteAbsolute;
      }
    } else {
      const viewport = getViewport();
      const zoom = viewport.zoom ?? 1;
      const centerX = (-viewport.x + window.innerWidth / 2) / zoom;
      const centerY = (-viewport.y + window.innerHeight / 2) / zoom;

      resolvedPosition = {
        x: centerX - NOTE_WIDTH / 2,
        y: centerY - NOTE_HEIGHT / 2,
      };
    }

    const newNode: MindMapNode = {
      id: newNoteId,
      type: "noteShape",
      position: resolvedPosition,
      data: {
        resourceType: "Note",
        iconName: "Note",
        description: "",
        isEditing: true,
        textProperties: defaultTextProps,
      },
      style: {
        width: NOTE_WIDTH,
        height: NOTE_HEIGHT,
      },
      width: NOTE_WIDTH,
      height: NOTE_HEIGHT,
      selected: true,
    };

    if (parentId) {
      newNode.parentId = parentId;
    }

    setNodes((prev) => [
      ...prev.map((node) =>
        node.selected || node.data.isEditing
          ? {
              ...node,
              selected: false,
              data: { ...node.data, isEditing: false },
            }
          : node,
      ),
      newNode,
    ]);
    setSelectedNodeId(newNoteId);
    setSelectedNodeIds([newNoteId]);
    setSelectedEdgeId(null);
    markUnsaved();
  }, [
    getViewport,
    markUnsaved,
    nodes,
    selectedNode,
    setNodes,
    setSelectedEdgeId,
    setSelectedNodeId,
    setSelectedNodeIds,
  ]);

  const handleTabKey = useCallback(() => {
    if (
      !selectedNode ||
      !selectedNodeId ||
      selectedNode?.data.isEditing ||
      selectedNode.type === "noteShape"
    )
      return;

    handleAddChildNode(selectedNode);
  }, [handleAddChildNode, selectedNode, selectedNodeId]);

  return {
    handleAddChildNode,
    handleAddSiblingNode,
    handleAddNoteNode,
    handleTabKey,
  } as const;
};
