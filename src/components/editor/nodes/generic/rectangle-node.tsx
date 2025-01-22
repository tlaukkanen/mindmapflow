import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";

import { DiagramElement } from "@/model/types";

export default memo(function RectangleNode(props: NodeProps<DiagramElement>) {
  return (
    <BaseNode
      {...props}
      className={`px-4 py-2 h-full w-full shadow-md rounded-md bg-white border-solid max-w-[250px]`}
    >
      <div />
      <div />
    </BaseNode>
  );
});
