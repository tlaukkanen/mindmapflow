import type { MindMapNode } from "@/model/types";

import { toPng } from "html-to-image";

import { logger as defaultLogger } from "@/services/logger";

const DEFAULT_SELECTOR = ".react-flow__viewport";
const DEFAULT_PADDING = 120;
const DEFAULT_BACKGROUND = "#fff";

export type MindmapExportErrorCode =
  | "mindmap-export/no-nodes"
  | "mindmap-export/bounds"
  | "mindmap-export/element-not-found";

export class MindmapExportError extends Error {
  constructor(
    public readonly code: MindmapExportErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "MindmapExportError";
  }
}

type LoggerLike = {
  debug?: (message: string, ...args: unknown[]) => void;
  warn?: (message: string, ...args: unknown[]) => void;
};

export interface MindmapExportOptions {
  padding?: number;
  selector?: string;
  pixelRatio?: number;
  backgroundColor?: string;
  logger?: LoggerLike;
}

export interface MindmapExportResult {
  dataUrl: string;
  width: number;
  height: number;
}

const resolveAbsolutePosition = (
  node: MindMapNode,
  lookup: Map<string, MindMapNode>,
) => {
  const internals = (
    node as unknown as {
      internals?: { positionAbsolute?: { x: number; y: number } };
    }
  ).internals;

  if (internals?.positionAbsolute) {
    return internals.positionAbsolute;
  }

  let x = node.position?.x ?? 0;
  let y = node.position?.y ?? 0;
  let current: MindMapNode | undefined = node;
  const visited = new Set<string>([node.id]);

  while (current?.parentId) {
    const parentId = current.parentId;

    if (!parentId || visited.has(parentId)) {
      break;
    }

    visited.add(parentId);

    const parent = lookup.get(parentId);

    if (!parent) {
      break;
    }

    x += parent.position?.x ?? 0;
    y += parent.position?.y ?? 0;
    current = parent;
  }

  return { x, y };
};

export async function renderMindmapToPng(
  nodes: MindMapNode[],
  options: MindmapExportOptions = {},
): Promise<MindmapExportResult> {
  if (nodes.length === 0) {
    throw new MindmapExportError(
      "mindmap-export/no-nodes",
      "No mindmap nodes available to export",
    );
  }

  const {
    padding = DEFAULT_PADDING,
    selector = DEFAULT_SELECTOR,
    backgroundColor = DEFAULT_BACKGROUND,
    logger = defaultLogger,
  } = options;

  const pixelRatio =
    options.pixelRatio ??
    (typeof window !== "undefined"
      ? Math.min(window.devicePixelRatio || 1, 2)
      : 1);

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));

  const bounds = nodes.reduce(
    (acc, node) => {
      const position = resolveAbsolutePosition(node, nodeLookup);
      const rawWidth =
        node.width ??
        node.measured?.width ??
        (typeof node.style?.width === "number"
          ? node.style.width
          : typeof node.style?.width === "string"
            ? parseFloat(node.style.width)
            : 0);
      const rawHeight =
        node.height ??
        node.measured?.height ??
        (typeof node.style?.height === "number"
          ? node.style.height
          : typeof node.style?.height === "string"
            ? parseFloat(node.style.height)
            : 0);

      const width = Number.isFinite(rawWidth) ? rawWidth : 0;
      const height = Number.isFinite(rawHeight) ? rawHeight : 0;
      const x1 = position.x;
      const y1 = position.y;
      const x2 = x1 + width;
      const y2 = y1 + height;

      return {
        minX: Math.min(acc.minX, x1),
        minY: Math.min(acc.minY, y1),
        maxX: Math.max(acc.maxX, x2),
        maxY: Math.max(acc.maxY, y2),
      };
    },
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );

  if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.maxX)) {
    logger.warn?.("Unable to calculate export bounds", { bounds });
    throw new MindmapExportError(
      "mindmap-export/bounds",
      "Unable to calculate diagram size",
    );
  }

  const contentWidth = bounds.maxX - bounds.minX;
  const contentHeight = bounds.maxY - bounds.minY;
  const imageWidth = Math.ceil(contentWidth + padding * 2);
  const imageHeight = Math.ceil(contentHeight + padding * 2);
  const translateX = padding - bounds.minX;
  const translateY = padding - bounds.minY;

  logger.debug?.("Calculated export bounds", {
    bounds,
    imageWidth,
    imageHeight,
    translateX,
    translateY,
  });

  const element = document.querySelector(selector);

  if (!element) {
    throw new MindmapExportError(
      "mindmap-export/element-not-found",
      `Mindmap canvas selector \"${selector}\" did not match any element`,
    );
  }

  const dataUrl = await toPng(element as HTMLElement, {
    backgroundColor,
    width: imageWidth,
    height: imageHeight,
    canvasWidth: imageWidth,
    canvasHeight: imageHeight,
    pixelRatio,
    style: {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${translateX}px, ${translateY}px)`,
      transformOrigin: "0 0",
    },
  });

  return {
    dataUrl,
    width: imageWidth,
    height: imageHeight,
  };
}
