import { memo } from "react";
import { useReactFlow } from "@xyflow/react";
import { IconButton, Tooltip } from "@mui/material";
import {
  PiTextB,
  PiTextItalic,
  PiTextUnderline,
  PiTextStrikethrough,
} from "react-icons/pi";

import { MindMapNode } from "@/model/types";

interface FormatToolbarProps {
  id: string;
}

export const FormatToolbar = memo(({ id }: FormatToolbarProps) => {
  const { setNodes } = useReactFlow<MindMapNode>();

  // Remove the position styling from button styles as it's conflicting
  const buttonStyles = {
    padding: "4px",
    minWidth: "28px",
    minHeight: "28px",
    margin: "2px",
    backgroundColor: "white",
    "&:hover": {
      backgroundColor: "#f8fafc",
    },
  };

  const toolbarStyles = {
    position: "absolute" as const,
    top: "-48px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "row" as const,
    gap: "2px",
    backgroundColor: "white",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    padding: "2px",
    zIndex: 9999,
  };

  // Define formatProperties to only include boolean properties
  type FormatProperty = "bold" | "italic" | "underline" | "strikethrough";

  const handleFormatChange = (property: FormatProperty) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === id) {
          const textProperties = node.data.textProperties || {};

          return {
            ...node,
            data: {
              ...node.data,
              textProperties: {
                ...textProperties,
                [property]: !textProperties[property],
              },
            },
          };
        }

        return node;
      }),
    );
  };

  return (
    <div style={toolbarStyles}>
      <Tooltip title="Bold">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("bold")}
        >
          <PiTextB className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("italic")}
        >
          <PiTextItalic className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Underline">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("underline")}
        >
          <PiTextUnderline className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Strikethrough">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("strikethrough")}
        >
          <PiTextStrikethrough className="w-4 h-4" />
        </IconButton>
      </Tooltip>
    </div>
  );
});

FormatToolbar.displayName = "FormatToolbar";
