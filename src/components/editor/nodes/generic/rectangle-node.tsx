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
    if (props.data.depth === 0)
      return "px-3 py-2 h-full w-full shadow-md rounded-md bg-white border-solid max-w-[250px]";
    if (props.data.depth === 1)
      return "px-3 py-1 h-full w-full shadow-md rounded-3xl bg-white border-solid max-w-[250px]";
    if (props.data.depth === 2)
      return "px-1 py-1 h-full text-sm w-full rounded-md border-solid border-0 bg-transparent max-w-[250px]";

    return "px-1 py-1 h-full text-xs w-full rounded-md border-solid border-0 bg-transparent max-w-[250px]";
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
