import { NodeProps, NodeResizer } from "@xyflow/react";
import { memo } from "react";
import { PiNoteThin } from "react-icons/pi";

import { BaseNode } from "../base-node";

import { MindMapNode } from "@/model/types";

export default memo(function NoteNode(props: NodeProps<MindMapNode>) {
  return (
    <BaseNode
      {...props}
      className="p-2 h-full text-sm shadow-lg rounded-sm bg-note border border-solid border-canvas-node-border text-canvas-node-text"
      style={{ transform: "rotate(-2deg)" }}
    >
      <div className="text-xs text-canvas-node-text whitespace-pre-wrap w-full" />
      <PiNoteThin
        className="absolute bottom-1 right-1 w-5 h-5 text-link"
        title="This is a free text note"
      />
      <NodeResizer
        color="#000"
        isVisible={props.selected}
        minHeight={20}
        minWidth={20}
      />
    </BaseNode>
  );
});
