import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";

import { DiagramElement } from "@/model/types";

export default memo(function CommentNode(props: NodeProps<DiagramElement>) {
  return (
    <BaseNode
      {...props}
      className="px-4 py-2 h-full shadow-md rounded-md bg-white border border-solid border-stone-200"
    >
      <div className="w-full">{props.data.description}</div>
    </BaseNode>
  );
});
