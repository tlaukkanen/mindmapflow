"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Background,
  BackgroundVariant,
  Edge,
  NodeTypes,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";

import rectangleNode from "./nodes/generic/rectangle-node";
import commentNode from "./nodes/generic/comment-node";
import noteNode from "./nodes/generic/note-node";
import textNode from "./nodes/generic/text-node";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";
import {
  DEFAULT_PALETTE_ID,
  type Palette,
  palettes,
  getPaletteById,
  paletteToCssVariables,
} from "@/config/palettes";

type ShareStatus = "idle" | "loading" | "loaded" | "not-found" | "error";

const nodeTypes: NodeTypes = {
  rectangleShape: rectangleNode,
  textShape: textNode,
  noteShape: noteNode,
  commentShape: commentNode,
};

interface SharedViewerInnerProps {
  shareId: string;
  onTitleChange: (title: string) => void;
}

function applyPaletteToDocument(palette: Palette) {
  if (typeof document === "undefined") {
    return;
  }

  const vars = paletteToCssVariables(palette);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.palette = palette.id;

  const body = document.body;

  body.dataset.palette = palette.id;
  body.style.background = vars["--page-background"];
  body.style.color = vars["--color-body-text"];
}

function SharedViewerCanvas({
  shareId,
  onTitleChange,
}: SharedViewerInnerProps) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [status, setStatus] = useState<ShareStatus>("idle");
  const [paletteId, setPaletteId] = useState<string>(DEFAULT_PALETTE_ID);
  const [showGrid, setShowGrid] = useState<boolean>(false);
  const previousPaletteRef = useRef<Palette | null>(null);

  const resolveTitle = useCallback((diagramNodes: MindMapNode[]): string => {
    const rootNode =
      diagramNodes.find((node) => node.id === "root") ||
      diagramNodes.find((node) => (node.data.depth ?? 0) === 0);

    const title = rootNode?.data?.description?.trim();

    return title && title.length > 0 ? title : "Untitled";
  }, []);

  useEffect(() => {
    const loadShare = async () => {
      if (!shareId) {
        setStatus("not-found");
        onTitleChange("Untitled");
        setPaletteId(DEFAULT_PALETTE_ID);
        setShowGrid(false);

        return;
      }

      setStatus("loading");
      onTitleChange("Loading…");
      setShowGrid(false);

      try {
        const response = await fetch(`/api/shares/${shareId}`);

        if (response.status === 404) {
          setStatus("not-found");
          onTitleChange("Not found");
          setPaletteId(DEFAULT_PALETTE_ID);
          setShowGrid(false);

          return;
        }

        if (!response.ok) {
          setStatus("error");
          onTitleChange("Error");
          setPaletteId(DEFAULT_PALETTE_ID);
          setShowGrid(false);

          return;
        }

        const data = await response.json();

        setNodes((data.nodes ?? []) as MindMapNode[]);
        setEdges((data.edges ?? []) as Edge[]);
        const resolvedPaletteId =
          typeof data.paletteId === "string" && data.paletteId.length > 0
            ? data.paletteId
            : DEFAULT_PALETTE_ID;

        setPaletteId(resolvedPaletteId);
        setShowGrid(Boolean(data.showGrid));
        const responseTitle =
          typeof data.title === "string" && data.title.trim().length > 0
            ? data.title.trim()
            : resolveTitle((data.nodes ?? []) as MindMapNode[]);

        onTitleChange(responseTitle);
        setStatus("loaded");
      } catch (error) {
        logger.error(`Failed to load shared mindmap ${shareId}`, error);
        setStatus("error");
        onTitleChange("Error");
        setPaletteId(DEFAULT_PALETTE_ID);
        setShowGrid(false);
      }
    };

    void loadShare();
  }, [onTitleChange, resolveTitle, shareId]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!previousPaletteRef.current) {
      const currentPaletteId = document.documentElement.dataset.palette;
      const existingPalette = currentPaletteId
        ? getPaletteById(currentPaletteId)
        : undefined;

      previousPaletteRef.current =
        existingPalette ?? getPaletteById(DEFAULT_PALETTE_ID) ?? palettes[0];
    }

    return () => {
      if (previousPaletteRef.current) {
        applyPaletteToDocument(previousPaletteRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status !== "loaded") {
      return;
    }

    const palette =
      getPaletteById(paletteId) ??
      getPaletteById(DEFAULT_PALETTE_ID) ??
      palettes[0];

    applyPaletteToDocument(palette);
  }, [paletteId, status]);

  useEffect(() => {
    if (status === "loaded" && nodes.length > 0) {
      fitView({ padding: 100, maxZoom: 1.0, duration: 400 });
    }
  }, [fitView, nodes, status]);

  const content = useMemo(() => {
    switch (status) {
      case "loading":
        return "Loading shared mindmap…";
      case "not-found":
        return "Shared mindmap link is invalid or expired.";
      case "error":
        return "Unable to load shared mindmap.";
      default:
        return null;
    }
  }, [status]);

  if (status !== "loaded") {
    return (
      <div className="flex flex-1 items-center justify-center text-panels-text">
        {content}
      </div>
    );
  }

  return (
    <ReactFlow
      fitView
      panOnDrag
      zoomOnScroll
      edges={edges}
      elementsSelectable={false}
      nodeTypes={nodeTypes}
      nodes={nodes}
      nodesConnectable={false}
      nodesDraggable={false}
      proOptions={{ hideAttribution: true }}
      selectionOnDrag={false}
    >
      {showGrid && (
        <Background
          color="var(--color-grid-lines, rgba(160, 160, 160, 0.25))"
          gap={20}
          id="shared-bg"
          lineWidth={0.2}
          variant={BackgroundVariant.Lines}
        />
      )}
    </ReactFlow>
  );
}

interface SharedViewerProps {
  shareId: string;
}

export function SharedViewer({ shareId }: SharedViewerProps) {
  const [title, setTitle] = useState<string>("Shared Mindmap");

  useEffect(() => {
    const pageTitle =
      title && title !== "Shared Mindmap"
        ? `MindMapFlow - ${title}`
        : "MindMapFlow";

    document.title = pageTitle;

    return () => {
      document.title = "MindMapFlow";
    };
  }, [title]);

  return (
    <ReactFlowProvider>
      <div className="flex h-[100dvh] flex-col bg-canvas-background">
        <header className="flex items-center gap-2 border-b border-panels-border bg-menuBar-background px-4 py-2 text-menuBar-text">
          <Image
            alt="MindMapFlow logo"
            className="h-5 w-5 object-contain"
            height={18}
            src="/app_icon.svg"
            width={18}
          />
          <span className="text-sm font-semibold">Shared Mindmap</span>
          <span className="text-xs opacity-70">|</span>
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs opacity-70">|</span>
          <span className="text-xs opacity-70">read-only</span>
        </header>
        <div className="flex flex-1">
          <SharedViewerCanvas shareId={shareId} onTitleChange={setTitle} />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
