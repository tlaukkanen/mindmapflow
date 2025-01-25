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
    const { setNodes, getNodes, getEdges, deleteElements } = useReactFlow();
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Remove the isNew effect

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
      
      // Check if the node has any child nodes (connected edges where this node is the source)
      const edges = getEdges();
      const hasChildren = edges.some(edge => edge.source === id);

      // If description is empty and node has no children, delete the node
      if (!newDescription.trim() && !hasChildren) {
        const nodeToDelete = getNodes().find(node => node.id === id);
        if (nodeToDelete && nodeToDelete.data.depth !== 0) {
          // Find the parent node before deletion
          const parentId = nodeToDelete.parentId;
          
          // Delete the node
          deleteElements({ nodes: [nodeToDelete] });

          // If there was a parent, select it
          if (parentId) {
            setNodes(nodes => 
              nodes.map(node => ({
                ...node,
                selected: node.id === parentId
              }))
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
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleBlur();
      }
    };

    // Create a function to wrap description text with proper styling
    const StyledDescription = () => {
      if (!data.isEditing) {
        // Always show editable area on double click, even if description is empty
        const textProps = data.textProperties;
        return (
          <div
            onDoubleClick={handleDoubleClick}
            className={clsx(
              "text-sm text-gray-600 whitespace-pre-wrap h-full flex flex-col min-h-[24px]",
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
            {data.description || ""}
          </div>
        );
      }
      return (
        <textarea
          ref={textareaRef}
          autoFocus // Add this
          className={clsx(
            "text-sm text-gray-600 whitespace-pre-wrap w-full h-full resize-none",
            "bg-transparent outline-none border-none",
          "font-['Roboto',_'Helvetica',_'Arial',_sans-serif']",  // Add this line
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
          style={{ fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif" }}
          defaultValue={data.description}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.currentTarget.select()} // Add this
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
        className={`group ${className} ${selected ? 'border-2 border-stone-800' : 'border border-stone-200'} touch-none`}
        style={{ ...style, touchAction: "none", userSelect: "none" }}
      >
        {/*<NodeResizer
          color="#000"
          isVisible={selected}
          minHeight={20}
          minWidth={20}
        />*/}
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
