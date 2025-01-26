import { memo } from "react";
import { IconButton, Tooltip } from "@mui/material";
import { PiPlus } from "react-icons/pi";

interface AddNodeButtonsProps {
  isRoot: boolean;
  childButtonOnRight: boolean;
  onAddChild: () => void;
  onAddSibling: () => void;
}

export const AddNodeButtons = memo(
  ({
    isRoot,
    childButtonOnRight,
    onAddChild,
    onAddSibling,
  }: AddNodeButtonsProps) => {
    const buttonStyles = {
      position: "absolute",
      zIndex: 9999, // Increased z-index value even further
      backgroundColor: "white",
      border: "1px solid #e2e8f0",
      padding: "4px",
      "&:hover": {
        backgroundColor: "#f8fafc",
      },
    };

    const childButtonPosition = {
      ...buttonStyles,
      top: "50%",
      transform: "translateY(-50%)",
      ...(childButtonOnRight ? { right: "-30px" } : { left: "-30px" }),
    };

    const siblingButtonPosition = {
      ...buttonStyles,
      bottom: "-30px",
      left: "50%",
      transform: "translateX(-50%)",
    };

    return (
      <>
        <Tooltip
          placement={childButtonOnRight ? "right" : "left"}
          title="Add child node"
        >
          <IconButton
            size="small"
            sx={childButtonPosition}
            onClick={(e) => {
              e.stopPropagation();
              onAddChild();
            }}
          >
            <PiPlus className="w-4 h-4" />
          </IconButton>
        </Tooltip>
        {!isRoot && (
          <Tooltip placement="top" title="Add sibling node">
            <IconButton
              size="small"
              sx={siblingButtonPosition}
              onClick={(e) => {
                e.stopPropagation();
                onAddSibling();
              }}
            >
              <PiPlus className="w-4 h-4" />
            </IconButton>
          </Tooltip>
        )}
      </>
    );
  },
);

AddNodeButtons.displayName = "AddNodeButtons";
