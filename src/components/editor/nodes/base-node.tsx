import React, { memo, ReactElement, useRef, useEffect } from "react";
import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import clsx from "clsx";
import { PiArrowsHorizontalBold, PiLinkSimpleBold } from "react-icons/pi";
import { IconButton } from "@mui/material";

import { useGridSettings } from "../grid-context";

import { AddNodeButtons } from "./add-node-buttons";
import { FormatToolbar } from "./format-toolbar";

import { setHasUnsavedChanges } from "@/hooks/use-auto-save";
import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

export interface TextProperties {
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

interface BaseNodeProps extends NodeProps<MindMapNode> {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties; // Add style prop support
  onAddChild?: () => void;
  onAddSibling?: () => void;
  descriptionClassName?: string;
}

export const BaseNode = memo(
  ({
    id,
    data,
    selected,
    dragging,
    children,
    className = "",
    style,
    onAddChild,
    onAddSibling,
    descriptionClassName,
  }: BaseNodeProps) => {
    const { setNodes, getNodes, getEdges, deleteElements } = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isResizingRef = useRef(false);
    const startXRef = useRef(0);
    const startWidthRef = useRef<number | undefined>(undefined);
    const { enabled: gridEnabled, step: gridStep } = useGridSettings();

    // Add effect to handle text selection when entering edit mode
    useEffect(() => {
      if (data.isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          0,
          textareaRef.current.value.length,
        );
      }
    }, [data.isEditing]);

    const handleDoubleClick = () => {
      logger.debug("BaseNode: handleDoubleClick");
      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, isEditing: true } }
            : node,
        ),
      );
    };

    const handleBlur = () => {
      const newDescription = textareaRef.current?.value || "";

      // Check if the node has any child nodes (connected edges where this node is the source)
      const edges = getEdges();
      const hasChildren = edges.some((edge) => edge.source === id);

      // If description is empty and node has no children, delete the node
      if (!newDescription.trim() && !hasChildren) {
        const nodeToDelete = getNodes().find((node) => node.id === id);

        if (nodeToDelete && nodeToDelete.data.depth !== 0) {
          // Find the parent node before deletion
          const parentId = nodeToDelete.parentId;

          // Delete the node
          deleteElements({ nodes: [nodeToDelete] });

          // If there was a parent, select it
          if (parentId) {
            setNodes((nodes) =>
              nodes.map((node) => ({
                ...node,
                selected: node.id === parentId,
              })),
            );
          }
        }

        return;
      }

      setNodes((prev) =>
        prev.map((node) =>
          node.id === id
            ? {
                ...node,
                data: {
                  ...node.data,
                  description: newDescription,
                  isEditing: false,
                },
              }
            : node,
        ),
      );
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
        e.preventDefault();
        handleBlur();
      }
    };

    // --- Horizontal Resize logic (drag handle) ---
    const MIN_WIDTH = 60;
    const MAX_WIDTH = 720;

    const resolveWidthValue = (value: unknown): number | undefined => {
      if (typeof value === "number" && Number.isFinite(value)) {
        return value;
      }

      if (typeof value === "string") {
        const parsed = parseFloat(value.replace("px", ""));

        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }

      return undefined;
    };

    const getCurrentWidth = () => {
      const nodeObj = getNodes().find((n) => n.id === id);
      const domWidth = containerRef.current
        ? containerRef.current.getBoundingClientRect().width
        : undefined;

      return (
        resolveWidthValue(style?.width) ??
        resolveWidthValue((data as any)?.style?.width) ??
        resolveWidthValue(nodeObj?.style?.width) ??
        resolveWidthValue(domWidth) ??
        resolveWidthValue(nodeObj?.width)
      );
    };

    const applyWidth = (newWidth: number) => {
      const effectiveStep = gridEnabled ? Math.max(1, gridStep) : 1;
      const snappedWidth = gridEnabled
        ? Math.round(newWidth / effectiveStep) * effectiveStep
        : newWidth;
      const clamped = Math.max(
        MIN_WIDTH,
        Math.min(MAX_WIDTH, Math.round(snappedWidth)),
      );

      setNodes((prev) =>
        prev.map((n) =>
          n.id === id
            ? {
                ...n,
                style: { ...(n.style || {}), width: clamped },
                // optional: keep width in node for layouting libraries that read it
                width: clamped,
              }
            : n,
        ),
      );
    };

    const onResizeMove = (clientX: number) => {
      if (!isResizingRef.current) return;
      const dx = clientX - startXRef.current;
      const base = startWidthRef.current ?? MIN_WIDTH;

      applyWidth(base + dx);
    };

    const handleMouseMove = (e: MouseEvent) => onResizeMove(e.clientX);
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) onResizeMove(e.touches[0].clientX);
    };

    const endResize = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", endResize);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", endResize);
      // mark change for autosave system if present by toggling a benign value
      setNodes((prev) => prev.map((n) => (n.id === id ? { ...n } : n)));
      setHasUnsavedChanges(true);
    };

    const beginResize = (clientX: number) => {
      isResizingRef.current = true;
      startXRef.current = clientX;
      startWidthRef.current = getCurrentWidth() ?? 240; // default starting width
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", endResize);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
      window.addEventListener("touchend", endResize);
    };

    const onHandleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      beginResize(e.clientX);
    };

    const onHandleTouchStart = (e: React.TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.touches && e.touches[0]) beginResize(e.touches[0].clientX);
    };

    const resolveNodeUrl = (value?: string | null) => {
      if (!value) {
        return null;
      }

      const trimmed = value.trim();

      if (!trimmed) {
        return null;
      }

      const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
        ? trimmed
        : `https://${trimmed}`;

      try {
        const url = new URL(candidate);

        if (url.protocol !== "http:" && url.protocol !== "https:") {
          return null;
        }

        return url.toString();
      } catch (error) {
        logger.warn("BaseNode: invalid URL detected", {
          nodeId: id,
          value,
          error,
        });

        return null;
      }
    };

    const handleLinkIconClick = (
      event: React.MouseEvent<HTMLButtonElement>,
      url: string,
    ) => {
      event.preventDefault();
      event.stopPropagation();

      const resolved = resolveNodeUrl(url);

      if (!resolved) {
        return;
      }

      if (typeof window === "undefined") {
        return;
      }

      window.open(resolved, "_blank", "noopener,noreferrer");
    };

    // Create a function to wrap description text with proper styling
    const StyledDescription = () => {
      const resolvedDescriptionClass =
        descriptionClassName ?? "text-canvas-node-text";

      if (!data.isEditing) {
        const textProps = data.textProperties;
        const resolvedUrl = resolveNodeUrl(data.url);
        const textAlign = textProps?.textAlign ?? "left";

        const forwardTouchPointer = (
          event: React.PointerEvent<HTMLDivElement>,
        ) => {
          if (event.pointerType !== "touch") {
            return;
          }

          const nodeElement = containerRef.current;

          if (!nodeElement) {
            return;
          }

          const interactiveAncestor = (
            event.target as HTMLElement | null
          )?.closest("button, a, textarea, input");

          if (interactiveAncestor) {
            return;
          }

          const pointerInit: PointerEventInit = {
            bubbles: true,
            cancelable: true,
            pointerType: "touch",
            clientX: event.clientX,
            clientY: event.clientY,
          };

          if (typeof PointerEvent === "function") {
            nodeElement.dispatchEvent(
              new PointerEvent("pointerdown", pointerInit),
            );
          } else {
            nodeElement.dispatchEvent(
              new MouseEvent("mousedown", {
                bubbles: true,
                cancelable: true,
                clientX: event.clientX,
                clientY: event.clientY,
              }),
            );
          }
        };

        return (
          <div
            className={clsx(
              "h-full flex flex-col min-h-[16px]",
              resolvedDescriptionClass,
              "px-1 touch-none select-none", // Add consistent padding and ensure touch dragging propagates
              // Text alignment horizontal
              textProps?.textAlign === "left" && "text-left",
              textProps?.textAlign === "center" && "text-center",
              textProps?.textAlign === "right" && "text-right",
              textProps?.textAlign === "justify" && "text-justify",
              // Text alignment vertical
              textProps?.verticalAlign === "top" && "justify-start",
              textProps?.verticalAlign === "middle" && "justify-center",
              textProps?.verticalAlign === "bottom" && "justify-end",
              // Font styles
              textProps?.bold && "font-bold",
              textProps?.italic && "italic",
              textProps?.underline && "underline",
              textProps?.strikethrough && "line-through",
            )}
            onDoubleClick={handleDoubleClick}
            onPointerDownCapture={forwardTouchPointer}
          >
            <div
              className={clsx(
                "inline-flex w-full flex-wrap items-start gap-1 touch-none pointer-events-none select-none",
                textAlign === "center" && "justify-center",
                textAlign === "right" && "justify-end",
                textAlign === "justify" && "justify-center",
              )}
            >
              <span className="min-w-0 whitespace-pre-wrap break-words">
                {data.description || ""}
              </span>
              {resolvedUrl && !data.isEditing && (
                <IconButton
                  disableRipple
                  aria-label="Open link"
                  className="pointer-events-auto select-none"
                  size="small"
                  sx={{
                    padding: "2px",
                    backgroundColor: "transparent",
                    color: "var(--color-canvas-node-text)",
                    "&:hover": {
                      backgroundColor: "rgba(148, 163, 184, 0.25)",
                    },
                  }}
                  title={resolvedUrl}
                  onClick={(event) => handleLinkIconClick(event, resolvedUrl)}
                >
                  <PiLinkSimpleBold className="h-3.5 w-3.5" />
                </IconButton>
              )}
            </div>
          </div>
        );
      }

      return (
        <div className="inset-0 px-1 ">
          {" "}
          {/* Wrapper div with padding */}
          <textarea
            ref={textareaRef}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            className={clsx(
              "whitespace-pre-wrap break-words w-full resize-none",
              resolvedDescriptionClass,
              "bg-transparent outline-none m-0 pt-2 border-0",
              "font-['Roboto',_'Helvetica',_'Arial',_sans-serif']",
              "overflow-hidden min-h-[12px]", // Add min-height
              // Inherit text alignments from parent
              data.textProperties?.textAlign === "left" && "text-left",
              data.textProperties?.textAlign === "center" && "text-center",
              data.textProperties?.textAlign === "right" && "text-right",
              data.textProperties?.textAlign === "justify" && "text-justify",
              // Font styles
              data.textProperties?.bold && "font-bold",
              data.textProperties?.italic && "italic",
              data.textProperties?.underline && "underline",
              data.textProperties?.strikethrough && "line-through",
            )}
            defaultValue={data.description}
            rows={1}
            style={{
              fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
              fontSize: "14px",
              width: "100%",
              //padding: "0", // Remove default padding
              //paddingTop: "8px", // Add padding top
            }}
            onBlur={handleBlur}
            onFocus={(e) => {
              e.currentTarget.select();
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
      );
    };

    // Replace direct children rendering with custom renderer
    const renderContent = () => {
      if (React.isValidElement(children)) {
        const child = children as ReactElement;

        // If children is a React element and has children property
        if (child.props && Array.isArray(child.props.children)) {
          return React.cloneElement(child, {
            ...child.props,
            children: child.props.children.map(
              (grandChild: React.ReactNode) => {
                if (
                  typeof grandChild === "string" &&
                  grandChild === data.description
                ) {
                  return <StyledDescription key="description" />;
                }

                return grandChild;
              },
            ),
          });
        }

        // If children is a React element without children array
        return child;
      }

      return (
        <>
          {children}
          <StyledDescription />
        </>
      );
    };

    // Helper to determine which side has connections
    const getConnectedHandles = () => {
      const edges = getEdges();
      const rightTarget = edges.some(
        (e) => e.target === id && e.targetHandle === `${id}-right-target`,
      );

      return { rightTarget };
    };

    const { rightTarget } = getConnectedHandles();
    const childButtonOnRight = !rightTarget;

    const showToolbar = selected && data.resourceType !== "Note" && !dragging;
    const showResizeHandle = selected && !dragging;

    return (
      <div
        ref={containerRef}
        className={clsx(
          "group relative border touch-none transition-[border-color]",
          className,
        )}
        style={{
          ...style,
          touchAction: "none",
          userSelect: "none",
          minHeight: "16px", // Add minimum height
          borderColor: selected
            ? "var(--color-primary)"
            : "var(--color-canvas-node-border)",
          outline: selected ? "2px solid var(--color-primary)" : undefined,
          outlineOffset: selected ? "0px" : undefined,
        }}
      >
        {showToolbar && (
          <>
            <AddNodeButtons
              childButtonOnRight={childButtonOnRight}
              isRoot={data.depth === 0}
              onAddChild={onAddChild || (() => {})}
              onAddSibling={onAddSibling || (() => {})}
            />
            <FormatToolbar id={id} resourceType={data.resourceType} />
          </>
        )}
        {/* Horizontal resize handle - bottom-left, white background like add buttons */}
        {showResizeHandle && (
          <button
            aria-label="Resize width"
            className={clsx(
              "absolute nodrag nopan right-0 -bottom-8 z-[9999]",
              "rounded bg-white text-slate-700 shadow-md border border-slate-200 p-1",
              "hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary",
              "w-7 h-7 flex items-center justify-center cursor-ew-resize",
            )}
            title="Drag to resize width"
            type="button"
            onMouseDown={onHandleMouseDown}
            onTouchStart={onHandleTouchStart}
          >
            <PiArrowsHorizontalBold size={16} />
          </button>
        )}
        {renderContent()}
        {data.isEditing && !dragging && (
          <FormatToolbar id={id} resourceType={data.resourceType} />
        )}
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-top-target`}
          isConnectable={false}
          position={Position.Top}
          type="target"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-top-source`}
          isConnectable={false}
          position={Position.Top}
          type="source"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-bottom-target`}
          isConnectable={false}
          position={Position.Bottom}
          type="target"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-bottom-source`}
          isConnectable={false}
          position={Position.Bottom}
          type="source"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-left-target`}
          isConnectable={false}
          position={Position.Left}
          type="target"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-left-source`}
          isConnectable={false}
          position={Position.Left}
          type="source"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-right-target`}
          isConnectable={false}
          position={Position.Right}
          type="target"
        />
        <Handle
          className="w-0 h-0 opacity-0 "
          id={`${id}-right-source`}
          isConnectable={false}
          position={Position.Right}
          type="source"
        />
      </div>
    );
  },
);

BaseNode.displayName = "BaseNode";
