import { NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Box } from "@mui/material";

import { BaseNode } from "../base-node";

import { DiagramElement } from "@/model/types";
import { IconService } from "@/services/icon-service";

export default memo(function AzureResourceCollection(
  props: NodeProps<DiagramElement>,
) {
  const { id, data, selected } = props;
  const Icon = data?.iconName
    ? IconService.getIconComponent(data.iconName)
    : undefined;

  return (
    <BaseNode
      {...props}
      className={`p-2 h-full shadow-sm rounded-md border border-dashed border-gray-200 ${data?.backgroundColor || "bg-collectionNodes-background100"}`}
      data={data}
      id={id}
      selected={selected}
    >
      <div className="flex items-center">
        <div className="rounded-full w-5 h-5 flex items-center justify-center">
          {Icon && <Icon />}
        </div>
        <div className="ml-2">
          <div className="text-xs ">{data?.resourceType || "Unknown"}</div>
          <div className="text-xs text-gray-500 cursor-pointer">
            {data?.resourceName || ""}
          </div>
        </div>
      </div>
      <Box sx={{ mt: 1 }} />
    </BaseNode>
  );
});
