import { Edge } from "@xyflow/react";

import { MindMapNode } from "@/model/types";
import { getAbsolutePosition } from "@/utils/node-utils";

export type AutoLayoutMode = "horizontal" | "vertical" | "radial";

type Direction = "left" | "right" | "top" | "bottom";

interface AutoLayoutOptions {
  rootNodeId: string;
  horizontalOffset?: number;
  rootVerticalSpacing?: number;
  childVerticalSpacing?: number;
  mode?: AutoLayoutMode;
}

const DEFAULT_HORIZONTAL_OFFSET = 240;
const DEFAULT_ROOT_VERTICAL_SPACING = 160;
const DEFAULT_CHILD_VERTICAL_SPACING = 100;

const ALL_DIRECTIONS: Direction[] = ["right", "left", "top", "bottom"];

const isDirection = (value: string): value is Direction => {
  return (ALL_DIRECTIONS as string[]).includes(value);
};

const extractDirectionFromHandle = (
  handle?: string | null,
): Direction | null => {
  if (!handle) return null;

  const segments = handle.split("-");

  if (segments.length < 2) return null;

  const candidate = segments[segments.length - 2];

  return isDirection(candidate) ? candidate : null;
};

const buildAbsolutePositionMap = (nodes: MindMapNode[]) => {
  const positionMap = new Map<string, { x: number; y: number }>();

  nodes.forEach((node) => {
    positionMap.set(node.id, getAbsolutePosition(node, nodes));
  });

  return positionMap;
};

export const getAutoLayoutedNodes = (
  nodes: MindMapNode[],
  edges: Edge[],
  options: AutoLayoutOptions,
): MindMapNode[] => {
  const rootNode = nodes.find((node) => node.id === options.rootNodeId);

  if (!rootNode) {
    return nodes;
  }

  const candidateNodes = nodes.filter((node) => {
    if (node.id === options.rootNodeId) return true;
    if (typeof node.data.depth === "number") return true;
    if (node.parentId) return true;

    return false;
  });

  if (!candidateNodes.length) {
    return nodes;
  }

  const candidateIds = new Set(candidateNodes.map((node) => node.id));

  const parentById = new Map<string, string | undefined>();

  nodes.forEach((node) => {
    parentById.set(node.id, node.parentId);
  });

  const childrenByParent = new Map<string, Set<string>>();

  const registerChild = (parentId: string, childId: string) => {
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, new Set());
    }

    childrenByParent.get(parentId)!.add(childId);
  };

  candidateNodes.forEach((node) => {
    if (!node.parentId) return;
    registerChild(node.parentId, node.id);
  });

  edges.forEach((edge) => {
    if (!candidateIds.has(edge.source) || !candidateIds.has(edge.target)) {
      return;
    }

    registerChild(edge.source, edge.target);
  });

  const reachableIds = new Set<string>();
  const computedDepth = new Map<string, number>();
  const queue: string[] = [];

  if (candidateIds.has(options.rootNodeId)) {
    queue.push(options.rootNodeId);
    computedDepth.set(options.rootNodeId, 0);
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (reachableIds.has(current)) {
      continue;
    }

    reachableIds.add(current);

    const currentDepth = computedDepth.get(current) ?? 0;
    const children = childrenByParent.get(current);

    if (!children) {
      continue;
    }

    children.forEach((childId) => {
      if (!candidateIds.has(childId)) {
        return;
      }

      if (!computedDepth.has(childId)) {
        computedDepth.set(childId, currentDepth + 1);
      }

      queue.push(childId);
    });
  }

  if (!reachableIds.size) {
    return nodes;
  }

  const horizontalOffset =
    options.horizontalOffset ?? DEFAULT_HORIZONTAL_OFFSET;
  const rootVerticalSpacing =
    options.rootVerticalSpacing ?? DEFAULT_ROOT_VERTICAL_SPACING;
  const childVerticalSpacing =
    options.childVerticalSpacing ?? DEFAULT_CHILD_VERTICAL_SPACING;
  const layoutMode = options.mode ?? "horizontal";

  const getSpacingForDepth = (depth: number) =>
    depth <= 1 ? rootVerticalSpacing : childVerticalSpacing;

  const getDepthOffset = (depth: number) =>
    depth === 0 ? 0 : rootVerticalSpacing + (depth - 1) * childVerticalSpacing;

  const absolutePositionMap = buildAbsolutePositionMap(nodes);
  const nodeById = new Map(nodes.map((node) => [node.id, node] as const));

  const edgesBySource = new Map<string, Edge[]>();

  edges.forEach((edge) => {
    if (!reachableIds.has(edge.source) || !reachableIds.has(edge.target)) {
      return;
    }

    if (!edgesBySource.has(edge.source)) {
      edgesBySource.set(edge.source, []);
    }

    edgesBySource.get(edge.source)!.push(edge);
  });

  candidateNodes.forEach((node) => {
    if (!node.parentId) {
      return;
    }

    if (!reachableIds.has(node.parentId) || !reachableIds.has(node.id)) {
      return;
    }

    const parentEdges = edgesBySource.get(node.parentId);
    const hasExisting = parentEdges?.some((edge) => edge.target === node.id);

    if (hasExisting) {
      return;
    }

    if (!edgesBySource.has(node.parentId)) {
      edgesBySource.set(node.parentId, []);
    }

    edgesBySource.get(node.parentId)!.push({
      id: `virtual-${node.parentId}-${node.id}`,
      source: node.parentId,
      target: node.id,
      type: "default",
    } as Edge);
  });

  const orderedChildrenByParent = new Map<string, string[]>();

  const getOrderedChildren = (parentId: string) => {
    if (orderedChildrenByParent.has(parentId)) {
      return orderedChildrenByParent.get(parentId)!;
    }

    const seen = new Set<string>();
    const ordered: string[] = [];
    const edgeList = edgesBySource.get(parentId);

    if (edgeList) {
      edgeList.forEach((edge) => {
        if (!reachableIds.has(edge.target) || seen.has(edge.target)) {
          return;
        }

        ordered.push(edge.target);
        seen.add(edge.target);
      });
    }

    const fallback = childrenByParent.get(parentId);

    if (fallback) {
      Array.from(fallback)
        .filter((childId) => reachableIds.has(childId))
        .sort((a, b) => {
          const aPos = absolutePositionMap.get(a);
          const bPos = absolutePositionMap.get(b);

          return (aPos?.x ?? 0) - (bPos?.x ?? 0);
        })
        .forEach((childId) => {
          if (!seen.has(childId)) {
            ordered.push(childId);
            seen.add(childId);
          }
        });
    }

    orderedChildrenByParent.set(parentId, ordered);

    return ordered;
  };

  reachableIds.forEach((nodeId) => {
    getOrderedChildren(nodeId);
  });

  const levelNodes = new Map<number, string[]>();
  const traversalQueue: string[] = [];

  if (reachableIds.has(options.rootNodeId)) {
    traversalQueue.push(options.rootNodeId);
  }

  const visited = new Set<string>();

  while (traversalQueue.length > 0) {
    const current = traversalQueue.shift()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const depth = computedDepth.get(current) ?? 0;

    if (!levelNodes.has(depth)) {
      levelNodes.set(depth, []);
    }

    levelNodes.get(depth)!.push(current);

    const children = getOrderedChildren(current);

    children.forEach((childId) => {
      if (reachableIds.has(childId)) {
        traversalQueue.push(childId);
      }
    });
  }

  const depthLevels = Array.from(levelNodes.keys()).sort((a, b) => a - b);

  const orientation = new Map<string, number>();

  orientation.set(rootNode.id, 0);

  const firstLevelNodes = levelNodes.get(1);

  if (firstLevelNodes && firstLevelNodes.length > 0) {
    const half = Math.ceil(firstLevelNodes.length / 2);

    firstLevelNodes.forEach((nodeId, index) => {
      orientation.set(nodeId, index < half ? 1 : -1);
    });
  }

  depthLevels
    .filter((depth) => depth >= 2)
    .forEach((depth) => {
      const nodesAtDepth = levelNodes.get(depth);

      nodesAtDepth?.forEach((nodeId) => {
        const parentId = parentById.get(nodeId);
        const parentOrientation = parentId
          ? (orientation.get(parentId) ?? 1)
          : 1;

        orientation.set(
          nodeId,
          parentOrientation === 0 ? 1 : parentOrientation,
        );
      });
    });

  const resolveDirection = (
    edge: Edge,
    parent: MindMapNode,
    child: MindMapNode,
  ): Direction => {
    const handleDirection = extractDirectionFromHandle(edge.sourceHandle);

    if (handleDirection) {
      return handleDirection;
    }

    const parentAbs = absolutePositionMap.get(parent.id);
    const childAbs = absolutePositionMap.get(child.id);

    if (!parentAbs || !childAbs) {
      return "right";
    }

    const dx = childAbs.x - parentAbs.x;
    const dy = childAbs.y - parentAbs.y;

    if (Math.abs(dx) >= Math.abs(dy)) {
      return dx >= 0 ? "right" : "left";
    }

    return dy >= 0 ? "bottom" : "top";
  };

  const newPositions = new Map<string, { x: number; y: number }>();

  const rootAbsolute = absolutePositionMap.get(rootNode.id) ??
    rootNode.position ?? { x: 0, y: 0 };

  newPositions.set(rootNode.id, {
    x: rootAbsolute.x,
    y: rootAbsolute.y,
  });

  const layoutNode = (
    node: MindMapNode,
    parentAbs: { x: number; y: number },
  ) => {
    const depth = computedDepth.get(node.id) ?? node.data.depth ?? 0;
    const childrenEdges = edgesBySource.get(node.id);

    if (!childrenEdges || childrenEdges.length === 0) {
      return;
    }

    const groupedChildren: Record<Direction, MindMapNode[]> = {
      left: [],
      right: [],
      top: [],
      bottom: [],
    };

    childrenEdges.forEach((edge) => {
      const child = nodeById.get(edge.target);

      if (!child || !reachableIds.has(child.id)) {
        return;
      }

      const direction = resolveDirection(edge, node, child);

      groupedChildren[direction].push(child);
    });

    ALL_DIRECTIONS.forEach((direction) => {
      const children = groupedChildren[direction];

      if (!children.length) {
        return;
      }

      if (direction === "left" || direction === "right") {
        children.sort((a, b) => {
          const aPos = absolutePositionMap.get(a.id)?.y ?? 0;
          const bPos = absolutePositionMap.get(b.id)?.y ?? 0;

          return aPos - bPos;
        });

        const spacing = getSpacingForDepth(depth + 1);
        const totalHeight = spacing * (children.length - 1);
        const startY = parentAbs.y - totalHeight / 2;
        const offsetX =
          direction === "right" ? horizontalOffset : -horizontalOffset;

        children.forEach((child, index) => {
          const position = {
            x: parentAbs.x + offsetX,
            y: startY + index * spacing,
          };

          newPositions.set(child.id, position);
          layoutNode(child, position);
        });
      } else {
        children.sort((a, b) => {
          const aPos = absolutePositionMap.get(a.id)?.x ?? 0;
          const bPos = absolutePositionMap.get(b.id)?.x ?? 0;

          return aPos - bPos;
        });

        const spacingX = horizontalOffset;
        const totalWidth = spacingX * (children.length - 1);
        const startX = parentAbs.x - totalWidth / 2;
        const offsetY =
          direction === "bottom"
            ? Math.max(getSpacingForDepth(depth + 1), childVerticalSpacing)
            : -Math.max(getSpacingForDepth(depth + 1), childVerticalSpacing);

        children.forEach((child, index) => {
          const position = {
            x: startX + index * spacingX,
            y: parentAbs.y + offsetY,
          };

          newPositions.set(child.id, position);
          layoutNode(child, position);
        });
      }
    });
  };

  const applyVerticalLayout = () => {
    depthLevels.forEach((depth) => {
      const nodesAtDepth = levelNodes.get(depth);

      if (!nodesAtDepth || nodesAtDepth.length === 0) {
        return;
      }

      if (depth === 0) {
        if (!newPositions.has(nodesAtDepth[0])) {
          newPositions.set(nodesAtDepth[0], {
            x: rootAbsolute.x,
            y: rootAbsolute.y,
          });
        }

        return;
      }

      const groupedByOrientation = new Map<number, string[]>();

      nodesAtDepth.forEach((nodeId) => {
        const nodeOrientation = orientation.get(nodeId) ?? 1;
        const sign = nodeOrientation === 0 ? 1 : Math.sign(nodeOrientation);

        if (!groupedByOrientation.has(sign)) {
          groupedByOrientation.set(sign, []);
        }

        groupedByOrientation.get(sign)!.push(nodeId);
      });

      groupedByOrientation.forEach((groupNodes, sign) => {
        if (!groupNodes.length) {
          return;
        }

        const y = rootAbsolute.y + sign * getDepthOffset(depth);

        if (groupNodes.length === 1) {
          newPositions.set(groupNodes[0], {
            x: rootAbsolute.x,
            y,
          });

          return;
        }

        const spacingX = horizontalOffset;
        const totalWidth = spacingX * (groupNodes.length - 1);
        const startX = rootAbsolute.x - totalWidth / 2;

        groupNodes.forEach((nodeId, index) => {
          newPositions.set(nodeId, {
            x: startX + index * spacingX,
            y,
          });
        });
      });
    });
  };

  const applyRadialLayout = () => {
    const angleInfo = new Map<
      string,
      { angle: number; start: number; end: number }
    >();

    const fullSpan = Math.PI * 2;
    const baseAngle = -Math.PI / 2;
    const firstLevel = levelNodes.get(1) ?? [];
    const firstLevelCount = firstLevel.length;
    const firstLevelStep =
      firstLevelCount > 0 ? fullSpan / firstLevelCount : fullSpan;
    const rootStart =
      firstLevelCount > 0
        ? baseAngle - firstLevelStep / 2
        : baseAngle - Math.PI;

    angleInfo.set(rootNode.id, {
      angle: baseAngle,
      start: rootStart,
      end: rootStart + fullSpan,
    });

    const assignAngleRange = (parentId: string) => {
      const parentInfo = angleInfo.get(parentId);

      if (!parentInfo) {
        return;
      }

      const children = getOrderedChildren(parentId).filter((childId) =>
        reachableIds.has(childId),
      );

      if (!children.length) {
        return;
      }

      const parentSpan = parentInfo.end - parentInfo.start;
      const segmentSpan = parentSpan / children.length;

      children.forEach((childId, index) => {
        const start = parentInfo.start + index * segmentSpan;
        const end = start + segmentSpan;
        const angle = (start + end) / 2;

        angleInfo.set(childId, { angle, start, end });
        assignAngleRange(childId);
      });
    };

    assignAngleRange(rootNode.id);

    depthLevels.forEach((depth) => {
      const nodesAtDepth = levelNodes.get(depth);

      if (!nodesAtDepth || nodesAtDepth.length === 0) {
        return;
      }

      if (depth === 0) {
        if (!newPositions.has(nodesAtDepth[0])) {
          newPositions.set(nodesAtDepth[0], {
            x: rootAbsolute.x,
            y: rootAbsolute.y,
          });
        }

        return;
      }

      const radius = Math.max(getDepthOffset(depth), horizontalOffset * depth);

      nodesAtDepth.forEach((nodeId) => {
        const info = angleInfo.get(nodeId);

        if (!info) {
          return;
        }

        newPositions.set(nodeId, {
          x: rootAbsolute.x + radius * Math.cos(info.angle),
          y: rootAbsolute.y + radius * Math.sin(info.angle),
        });
      });
    });
  };

  if (layoutMode === "vertical") {
    applyVerticalLayout();
  } else if (layoutMode === "radial") {
    applyRadialLayout();
  } else {
    layoutNode(rootNode, newPositions.get(rootNode.id)!);
  }

  return nodes.map((node) => {
    if (!reachableIds.has(node.id)) {
      return node;
    }

    const absolutePosition = newPositions.get(node.id);

    if (!absolutePosition) {
      return node;
    }

    if (!node.parentId) {
      const originalAbsolute = absolutePositionMap.get(node.id);

      if (
        node.position.x === absolutePosition.x &&
        node.position.y === absolutePosition.y &&
        originalAbsolute?.x === absolutePosition.x &&
        originalAbsolute?.y === absolutePosition.y
      ) {
        return node;
      }

      return {
        ...node,
        position: absolutePosition,
      };
    }

    const parentAbsolute =
      newPositions.get(node.parentId) ?? absolutePositionMap.get(node.parentId);

    if (!parentAbsolute) {
      return node;
    }

    const relativePosition = {
      x: absolutePosition.x - parentAbsolute.x,
      y: absolutePosition.y - parentAbsolute.y,
    };

    const originalAbsolute = absolutePositionMap.get(node.id);

    if (
      node.position.x === relativePosition.x &&
      node.position.y === relativePosition.y &&
      originalAbsolute?.x === absolutePosition.x &&
      originalAbsolute?.y === absolutePosition.y
    ) {
      return node;
    }

    return {
      ...node,
      position: relativePosition,
    };
  });
};
