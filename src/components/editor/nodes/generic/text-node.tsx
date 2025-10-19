import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";

import { MindMapNode } from "@/model/types";

export default memo(function TextNode(props: NodeProps<MindMapNode>) {
  const { data } = props;

  return (
    <BaseNode
      {...props}
      className="px-4 py-2 h-full w-full bg-transparent border-0 touch-none select-none"
    >
      <div className="text-xs text-canvas-node-text whitespace-pre-wrap w-full touch-none select-none" />
      <div className="text-xs text-canvas-node-text w-full flex align-middle justify-center touch-none select-none">
        {!data.description && "Enter text"}
      </div>
    </BaseNode>
  );
});
