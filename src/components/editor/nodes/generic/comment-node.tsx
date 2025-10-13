import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";

import { MindMapNode } from "@/model/types";

export default memo(function CommentNode(props: NodeProps<MindMapNode>) {
  return (
    <BaseNode
      {...props}
      className="px-4 py-2 h-full shadow-md rounded-md bg-canvas-node-background border border-solid border-canvas-node-border text-canvas-node-text"
    >
      <div className="w-full">{props.data.description}</div>
    </BaseNode>
  );
});
