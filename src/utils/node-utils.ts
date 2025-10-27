import { Edge, Node } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

const ANGLE_THRESHOLD = 45; // 45 degrees on each side = 90 degree scope

export type Direction = "left" | "right" | "top" | "bottom";

function getAngleBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
}

function isNodeInDirection(
  angle: number,
  targetDirection: "left" | "right" | "up" | "down",
): boolean {
  const normalizedAngle = ((angle % 360) + 360) % 360;

  switch (targetDirection) {
    case "right":
      return (
        normalizedAngle >= 360 - ANGLE_THRESHOLD ||
        normalizedAngle <= ANGLE_THRESHOLD
      );
    case "left":
      return (
        normalizedAngle >= 180 - ANGLE_THRESHOLD &&
        normalizedAngle <= 180 + ANGLE_THRESHOLD
      );
    case "up":
      return (
        normalizedAngle >= 270 - ANGLE_THRESHOLD &&
        normalizedAngle <= 270 + ANGLE_THRESHOLD
      );
    case "down":
      return (
        normalizedAngle >= 90 - ANGLE_THRESHOLD &&
        normalizedAngle <= 90 + ANGLE_THRESHOLD
      );
  }
}

export const getAbsolutePosition = (
  node: MindMapNode,
  nodes: MindMapNode[],
): { x: number; y: number } => {
  const position = { x: node.position.x, y: node.position.y };
  let currentNode = node;

  while (currentNode.parentId) {
    const parent = nodes.find((n) => n.id === currentNode.parentId);

    if (!parent) break;

    position.x += parent.position.x;
    position.y += parent.position.y;
    currentNode = parent;
  }

  return position;
};

export const getOppositeDirection = (direction: Direction): Direction => {
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

export const getBasePositionForDirection = (
  direction: Direction,
): { x: number; y: number } => ({
  x: direction === "right" ? 200 : direction === "left" ? -200 : 0,
  y: direction === "bottom" ? 100 : direction === "top" ? -120 : 0,
});

const getHandleDirectionFromHandle = (
  handle?: string | null,
): Direction | null => {
  if (!handle) {
    return null;
  }

  const parts = handle.split("-");

  if (parts.length < 2) {
    return null;
  }

  const directionCandidate = parts[parts.length - 2];

  if (
    directionCandidate === "left" ||
    directionCandidate === "right" ||
    directionCandidate === "top" ||
    directionCandidate === "bottom"
  ) {
    return directionCandidate;
  }

  return null;
};

export const determinePreferredDirection = (
  parentNode: MindMapNode,
  edges: Edge[],
  rootNodeId: string,
): Direction => {
  const connections: Record<Direction, number> = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  };

  edges
    .filter((edge) => edge.source === parentNode.id)
    .forEach((edge) => {
      const direction = getHandleDirectionFromHandle(edge.sourceHandle);

      if (direction) {
        connections[direction] += 1;
      }
    });

  if (parentNode.id === rootNodeId) {
    const minConnections = Math.min(
      connections.left,
      connections.right,
      connections.top,
      connections.bottom,
    );

    if (connections.left === minConnections) return "left";
    if (connections.right === minConnections) return "right";
    if (connections.top === minConnections) return "top";

    return "bottom";
  }

  const totalOutgoing =
    connections.left + connections.right + connections.top + connections.bottom;

  if (totalOutgoing === 0) {
    const incoming = edges.find((edge) => edge.target === parentNode.id);
    const incomingDirection = getHandleDirectionFromHandle(
      incoming?.targetHandle,
    );

    if (incomingDirection) {
      return getOppositeDirection(incomingDirection);
    }
  }

  const sorted = Object.entries(connections).sort((a, b) => b[1] - a[1]);

  logger.debug(
    `Sorted connections for ${parentNode.id}: ${JSON.stringify(sorted)}`,
  );

  return (sorted[0]?.[0] as Direction) ?? "right";
};

export const findFreePosition = (
  nodes: MindMapNode[],
  basePosition: { x: number; y: number },
  spacing: number = 100,
  parentId: string | undefined,
  getIntersectingNodes: (node: Node) => Node[],
): { x: number; y: number } => {
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

  if (parentId) {
    const parent = nodes.find((n) => n.id === parentId);

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

export function findClosestNodeInDirection(
  currentNode: MindMapNode,
  nodes: MindMapNode[],
  direction: "left" | "right" | "up" | "down",
): MindMapNode | null {
  let closestNode: MindMapNode | null = null;
  let minDistance = Infinity;

  const currentAbsPos = getAbsolutePosition(currentNode, nodes);

  nodes.forEach((node) => {
    if (node.id === currentNode.id) return;

    const nodeAbsPos = getAbsolutePosition(node, nodes);
    const dx = nodeAbsPos.x - currentAbsPos.x;
    const dy = nodeAbsPos.y - currentAbsPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = getAngleBetweenPoints(
      currentAbsPos.x,
      currentAbsPos.y,
      nodeAbsPos.x,
      nodeAbsPos.y,
    );

    if (isNodeInDirection(angle, direction)) {
      if (distance < minDistance) {
        minDistance = distance;
        closestNode = node;
      }
    }
  });

  return closestNode;
}

export function getOptimalHandlePair(
  parentNode: MindMapNode,
  childNode: MindMapNode,
  nodes: MindMapNode[],
): { sourceHandle: string; targetHandle: string } {
  const parentPos = getAbsolutePosition(parentNode, nodes);
  const childPos = getAbsolutePosition(childNode, nodes);

  const angle = getAngleBetweenPoints(
    parentPos.x,
    parentPos.y,
    childPos.x,
    childPos.y,
  );

  // Determine the best direction based on angle
  let direction: Direction;
  const normalizedAngle = ((angle % 360) + 360) % 360;

  if (normalizedAngle >= 315 || normalizedAngle < 45) {
    direction = "right";
  } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
    direction = "bottom";
  } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
    direction = "left";
  } else {
    direction = "top";
  }

  // Map direction to handle pairs
  const handlePairs = {
    right: {
      sourceHandle: `${parentNode.id}-right-source`,
      targetHandle: `${childNode.id}-left-target`,
    },
    left: {
      sourceHandle: `${parentNode.id}-left-source`,
      targetHandle: `${childNode.id}-right-target`,
    },
    top: {
      sourceHandle: `${parentNode.id}-top-source`,
      targetHandle: `${childNode.id}-bottom-target`,
    },
    bottom: {
      sourceHandle: `${parentNode.id}-bottom-source`,
      targetHandle: `${childNode.id}-top-target`,
    },
  };

  return handlePairs[direction];
}

export function updateEdgeConnections(
  nodes: MindMapNode[],
  edges: Edge[],
  movedNodeId: string,
): Edge[] {
  // Find all edges connected to the moved node
  const connectedEdges = edges.filter(
    (edge) => edge.source === movedNodeId || edge.target === movedNodeId,
  );

  return edges.map((edge) => {
    if (!connectedEdges.includes(edge)) return edge;

    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return edge;

    // Get optimal handle pair based on current positions
    const { sourceHandle, targetHandle } = getOptimalHandlePair(
      sourceNode,
      targetNode,
      nodes,
    );

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });
}

export function recalculateAllEdgeConnections(
  nodes: MindMapNode[],
  edges: Edge[],
): Edge[] {
  return edges.map((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      return edge;
    }

    const { sourceHandle, targetHandle } = getOptimalHandlePair(
      sourceNode,
      targetNode,
      nodes,
    );

    if (
      edge.sourceHandle === sourceHandle &&
      edge.targetHandle === targetHandle
    ) {
      return edge;
    }

    return {
      ...edge,
      sourceHandle,
      targetHandle,
    };
  });
}
