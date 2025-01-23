import { NodeProps } from "@xyflow/react";
import { memo } from "react";

import { BaseNode } from "../base-node";
import { DiagramElement } from "@/model/types";

export default memo(function RectangleNode(props: NodeProps<DiagramElement>) {
  const getNodeStyle = () => {
    if (props.data.depth === 2) return 'px-4 py-2 h-full w-full rounded-md border-solid border-0 bg-transparent max-w-[250px]';
    if (props.data.depth === 1) return 'px-4 py-2 h-full w-full shadow-md rounded-3xl bg-white border-solid max-w-[250px]';
    return 'px-4 py-2 h-full w-full shadow-md rounded-md bg-white border-solid max-w-[250px]';
  };

  return (
    <BaseNode
      {...props}
      className={getNodeStyle()}
    >
      <div />
      <div />
    </BaseNode>
  );
});
