"use client";

import {
  AppBar,
  Toolbar as MUIToolbar,
  Box,
  Typography,
  Button,
  Link,
  Menu,
  MenuItem,
} from "@mui/material";
import Image from "next/image";
import React from "react";
import { toast } from "sonner";
import {
  getNodesBounds,
  getViewportForBounds,
  useReactFlow,
} from "@xyflow/react";
import { toPng } from "html-to-image";

import { useEditor } from "@/store/editor-context";
import { logger } from "@/services/logger";

interface MenubarProps {
  onNewProject: () => void;
  onCopyJsonToClipboard: () => void;
}

export const Menubar = ({
  onNewProject,
  onCopyJsonToClipboard,
}: MenubarProps) => {
  const { getNodes } = useReactFlow();
  const { isFullScreen } = useEditor();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [editAnchorEl, setEditAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const projectMenuOpen = Boolean(anchorEl);
  const editMenuOpen = Boolean(editAnchorEl);

  const handleProjectMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleEditMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setEditAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setEditAnchorEl(null);
  };

  const downloadImage = (dataUrl: string) => {
    const a = document.createElement("a");

    a.setAttribute("download", "reactflow.png");
    a.setAttribute("href", dataUrl);
    a.click();
  };

  const handleCopyAsImage = () => {
    handleMenuClose();
    const nodesBounds = getNodesBounds(getNodes());

    logger.debug("Nodes bounds", nodesBounds);
    const imageWidth = 1024;
    const imageHeight = 768;
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.03,
    );

    logger.debug("Viewport", viewport);

    const element = document.querySelector(".react-flow__viewport");

    if (!element) return;

    toPng(element as HTMLElement, {
      backgroundColor: "#fff",
      width: imageWidth,
      height: imageHeight,
      style: {
        transform: `translate(0, 0) scale(1)`,
      },
    }).then(downloadImage);

    toast.info(`Downloading image: ${viewport.x}x${viewport.y}`);
  };

  if (isFullScreen) {
    return null;
  }

  return (
    <>
      <AppBar
        className="bg-menuBar-background shadow-stone-800 shadow-md text-panels-text border-b border-solid border-0 border-panels-border"
        elevation={0}
        position="sticky"
      >
        <MUIToolbar
          className="bg-menuBar-background border-b  border-b-panels-border text-menuBar-text"
          variant="dense"
        >
          <Box
            sx={{
              flex: "2 1 auto",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Link
              className="flex justify-start items-center gap-1 text-prussianBlue"
              href="/"
              underline="none"
            >
              <Image
                alt="Logo"
                className="w-6 h-6 object-contain"
                height={24}
                src="/mindmapflow_icon.svg"
                width={24}
              />
              <Box width={12} />
              <Typography className="font-extrabold text-menuBar-text">
                MindMapFlow
              </Typography>
            </Link>
            <div className="flex gap-0">
              <Button
                className="text-xs"
                color="inherit"
                size="small"
                onClick={handleProjectMenuClick}
              >
                Project
              </Button>
              <Menu
                MenuListProps={{
                  "aria-labelledby": "project-menu",
                }}
                anchorEl={anchorEl}
                id="project-menu"
                open={projectMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    onNewProject();
                    handleMenuClose();
                  }}
                >
                  New Project
                </MenuItem>
                <MenuItem disabled onClick={handleMenuClose}>
                  Open Project (Coming soon)
                </MenuItem>
                <MenuItem disabled onClick={handleMenuClose}>
                  Save Project (Coming soon)
                </MenuItem>
                <MenuItem disabled onClick={handleMenuClose}>
                  Export (Coming later)
                </MenuItem>
              </Menu>
              <Button
                className="text-xs"
                color="inherit"
                size="small"
                onClick={handleEditMenuClick}
              >
                Edit
              </Button>
              <Menu
                MenuListProps={{
                  "aria-labelledby": "edit-menu",
                }}
                anchorEl={editAnchorEl}
                id="edit-menu"
                open={editMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={handleCopyAsImage}>Save as image</MenuItem>
                <MenuItem onClick={onCopyJsonToClipboard}>
                  Copy as JSON to clipboard
                </MenuItem>
                <MenuItem disabled onClick={handleMenuClose}>
                  Still in progress
                </MenuItem>
                <MenuItem disabled onClick={handleMenuClose}>
                  Still in progress
                </MenuItem>
              </Menu>
            </div>
          </Box>
          <Box
            sx={{
              flex: "3 1 auto",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Box className="gap-3 border-1 rounded-md py-1 px-2 text-xs text-gray-400">
              ⚠️ Beta {process.env.NEXT_PUBLIC_VERSION_TAG || "v0.0.0"}
            </Box>
          </Box>
        </MUIToolbar>
      </AppBar>
    </>
  );
};
