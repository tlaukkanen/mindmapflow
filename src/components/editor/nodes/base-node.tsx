import React, { memo, ReactElement, useRef, useEffect } from "react";
import { Handle, NodeProps, Position, useReactFlow } from "@xyflow/react";
import clsx from "clsx";

import { AddNodeButtons } from "./add-node-buttons";

import { DiagramElement } from "@/model/types";
import { logger } from "@/services/logger";

export interface TextProperties {
  textAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

interface BaseNodeProps extends NodeProps<DiagramElement> {
  className?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties; // Add style prop support
  onAddChild?: () => void;
  onAddSibling?: () => void;
}

export const BaseNode = memo(
  ({
    id,
    data,
    selected,
    children,
    className = "",
    style,
    onAddChild,
    onAddSibling,
  }: BaseNodeProps) => {
    const { setNodes, getNodes, getEdges, deleteElements } = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    };

    // Create a function to wrap description text with proper styling
    const StyledDescription = () => {
      if (!data.isEditing) {
        const textProps = data.textProperties;

        return (
          <div
            className={clsx(
              "text-gray-600 whitespace-pre-wrap h-full flex flex-col min-h-[16px]",
              "px-1 ", // Add consistent padding
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
            style={{ pointerEvents: "none" }} // Add this to prevent touch event interception
            onDoubleClick={handleDoubleClick}
          >
            {data.description || ""}
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
              "text-gray-600 whitespace-pre-wrap w-full resize-none",
              "bg-transparent outline-none border-solid border-red",
              "font-['Roboto',_'Helvetica',_'Arial',_sans-serif']",
              "overflow-hidden min-h-[16px]", // Add min-height
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
              padding: "0", // Remove default padding
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
      const rightSource = edges.some(
        (e) => e.source === id && e.sourceHandle === `${id}-right-source`,
      );
      const leftSource = edges.some(
        (e) => e.source === id && e.sourceHandle === `${id}-left-source`,
      );

      return { rightSource, leftSource };
    };

    const { rightSource, leftSource } = getConnectedHandles();
    const childButtonOnRight = !rightSource || (leftSource && !rightSource);

    return (
      <div
        className={`group relative ${className} ${selected ? "border-2 border-stone-800" : "border border-stone-200"} touch-none`}
        style={{
          ...style,
          touchAction: "none",
          userSelect: "none",
          minHeight: "16px", // Add minimum height
        }}
      >
        {selected && (
          <AddNodeButtons
            childButtonOnRight={childButtonOnRight}
            isRoot={data.depth === 0}
            onAddChild={onAddChild || (() => {})}
            onAddSibling={onAddSibling || (() => {})}
          />
        )}
        {renderContent()}
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-top-target`}
          position={Position.Top}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-top-source`}
          position={Position.Top}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-bottom-target`}
          position={Position.Bottom}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-bottom-source`}
          position={Position.Bottom}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-left-target`}
          position={Position.Left}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-left-source`}
          position={Position.Left}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-right-target`}
          position={Position.Right}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 "
          id={`${id}-right-source`}
          position={Position.Right}
          type="source"
        />
      </div>
    );
  },
);

BaseNode.displayName = "BaseNode";
