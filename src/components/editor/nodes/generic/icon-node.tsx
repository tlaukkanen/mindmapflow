import { NodeProps } from "@xyflow/react";
import { memo, useEffect, useState } from "react";

import { BaseNode } from "../base-node";

import { IconService } from "@/services/icon-service";
import { DiagramElement } from "@/model/types";

export default memo(function IconNode(props: NodeProps<DiagramElement>) {
  const [svgContent, setSvgContent] = useState<string>("");

  useEffect(() => {
    const loadSvg = async () => {
      if (
        props.data?.iconName &&
        IconService.isValidSvgIcon(props.data.iconName)
      ) {
        const iconPath = IconService.getSvgIcon(props.data.iconName);

        try {
          const response = await fetch(iconPath!);
          const svgText = await response.text();

          setSvgContent(svgText);
        } catch (error) {
          console.error("Error loading SVG:", error);
        }
      }
    };

    loadSvg();
  }, [props.data?.iconName]);

  return (
    <BaseNode {...props} className="px-2 py-0 w-full h-full bg-transparent">
      <div className="flex flex-col w-full h-full">
        <div className="flex-1 w-full flex items-center justify-center">
          {svgContent && (
            <div
              dangerouslySetInnerHTML={{
                __html: svgContent.replace(
                  "<svg",
                  '<svg class="w-full h-full" style="max-width: 100%; max-height: 100%;"',
                ),
              }}
              className="w-full h-full flex items-center justify-center"
            />
          )}
        </div>
        <div className="w-full flex align-middle justify-center text-xs text-gray-500">
          {props.data.description}
        </div>
      </div>
    </BaseNode>
  );
});
