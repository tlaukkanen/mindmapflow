import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";

import { MindMapNode } from "@/model/types";

// Create a new interface that extends NodeProps and includes our additional props
interface RectangleNodeProps extends NodeProps<MindMapNode> {
  onAddChild?: () => void;
  onAddSibling?: () => void;
}

export default memo(function RectangleNode(props: RectangleNodeProps) {
  const getNodeStyle = () => {
    const base = "h-full w-full max-w-[250px] text-canvas-node-text";

    if (props.data.depth === 0)
      return `${base} px-3 py-2 shadow-md rounded-md border border-solid border-canvas-node-border bg-canvas-node-background`;
    if (props.data.depth === 1)
      return `${base} px-3 py-1 shadow-md rounded-3xl border border-solid border-canvas-node-border bg-canvas-node-background`;
    if (props.data.depth === 2)
      return `${base} px-1 py-1 text-sm rounded-md border-0 border-solid bg-transparent`;

    return `${base} px-1 py-1 text-xs rounded-md border-0 border-solid bg-transparent`;
  };

  return (
    <BaseNode
      {...props}
      className={getNodeStyle()}
      onAddChild={props.data.onAddChild}
      onAddSibling={props.data.onAddSibling}
    >
      <div />
      <div />
    </BaseNode>
  );
});
