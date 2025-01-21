import React, { memo, ReactElement, useRef, useEffect } from "react";
import { Handle, NodeProps, NodeResizer, Position, useReactFlow } from "@xyflow/react";
import clsx from "clsx";

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
}

export const BaseNode = memo(
  ({ id, data, selected, children, className = "", style }: BaseNodeProps) => {
    const { setNodes } = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Add effect to handle text selection when entering edit mode
    useEffect(() => {
      if (data.isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(0, textareaRef.current.value.length);
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
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    };

    // Create a function to wrap description text with proper styling
    const StyledDescription = () => {
      if (!data.isEditing) {
        if (!data.description) return null;

        const textProps = data.textProperties;

        return (
          <div
            onDoubleClick={handleDoubleClick}
            className={clsx(
              "text-sm text-gray-600 whitespace-pre-wrap h-full flex flex-col",
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
          >
            {data.description}
          </div>
        );
      }
      return (
        <textarea
          ref={textareaRef}
          className={clsx(
            "text-sm text-gray-600 whitespace-pre-wrap w-full h-full resize-none",
            "bg-transparent outline-none border-none",
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
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
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

    return (
      <div
        className={`group ${className} touch-none`}
        style={{ ...style, touchAction: "none", userSelect: "none" }}
      >
        <NodeResizer
          color="#000"
          isVisible={selected}
          minHeight={20}
          minWidth={20}
        />
        {renderContent()}
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-top-target`}
          position={Position.Top}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-top-source`}
          position={Position.Top}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-bottom-target`}
          position={Position.Bottom}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-bottom-source`}
          position={Position.Bottom}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-left-target`}
          position={Position.Left}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-left-source`}
          position={Position.Left}
          type="source"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-right-target`}
          position={Position.Right}
          type="target"
        />
        <Handle
          className="w-3 h-3 opacity-0 group-hover:opacity-100"
          id={`${id}-right-source`}
          position={Position.Right}
          type="source"
        />
      </div>
    );
  },
);

BaseNode.displayName = "BaseNode";
