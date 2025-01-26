import { Edge } from "@xyflow/react";

import { DiagramElement } from "@/model/types";

const ANGLE_THRESHOLD = 45; // 45 degrees on each side = 90 degree scope

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
  // Normalize angle to 0-360
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
  node: DiagramElement,
  nodes: DiagramElement[],
): { x: number; y: number } => {
  const position = { x: node.position.x, y: node.position.y };
  let currentNode = node;

  // Traverse up the parent chain and accumulate positions
  while (currentNode.parentId) {
    const parent = nodes.find((n) => n.id === currentNode.parentId);

    if (!parent) break;

    position.x += parent.position.x;
    position.y += parent.position.y;
    currentNode = parent;
  }

  return position;
};

export function findClosestNodeInDirection(
  currentNode: DiagramElement,
  nodes: DiagramElement[],
  direction: "left" | "right" | "up" | "down",
): DiagramElement | null {
  let closestNode: DiagramElement | null = null;
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

type Direction = "left" | "right" | "top" | "bottom";

export function getOptimalHandlePair(
  parentNode: DiagramElement,
  childNode: DiagramElement,
  nodes: DiagramElement[],
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
  nodes: DiagramElement[],
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
