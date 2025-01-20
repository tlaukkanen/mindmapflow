import { NodeProps } from "@xyflow/react";
import { memo } from "react";
import { Box } from "@mui/material";

import { BaseNode } from "../base-node";

import { IconService } from "@/services/icon-service";
import { DiagramElement } from "@/model/types";

export default memo(function AzureResourceNode(
  props: NodeProps<DiagramElement>,
) {
  const { id, data, selected } = props;
  const IconComponent = data?.iconName
    ? IconService.getIconComponent(data.iconName)
    : undefined;

  const frameStyles =
    data.showFrame !== false
      ? "shadow-md rounded-md bg-white border border-solid border-stone-200"
      : "";

  return (
    <BaseNode
      {...props}
      className={`p-2 pr-0.5 h-full w-full bg-transparent ${frameStyles}`}
      data={data}
      id={id}
      selected={selected}
    >
      <div className="flex items-center">
        <div className="rounded-full w-5 h-5 flex items-center justify-center">
          {IconComponent && <IconComponent />}
        </div>
        <div className="ml-2">
          <div className="text-xs font-normal">
            {data?.resourceType || "Unknown"}
          </div>
          <div className="text-xs text-gray-500 cursor-pointer">
            {data?.resourceName || ""}
            {data?.sku && (
              <div className="text-xs text-gray-400">SKU: {data.sku}</div>
            )}
            {data.resourceOptions
              ?.filter((opt) => opt.show)
              .map((option) => (
                <div key={option.name} className="text-xs text-gray-400">
                  {option.name}:{" "}
                  <span className="font-thin">{option.value}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
      <Box sx={{ mt: 1 }} />
    </BaseNode>
  );
});
