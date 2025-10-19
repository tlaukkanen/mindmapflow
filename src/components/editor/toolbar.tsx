import { useState } from "react";
import {
  AppBar,
  Toolbar as MUIToolbar,
  Box,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { TbLayoutSidebarRightCollapseFilled } from "react-icons/tb";
import { MdFullscreen } from "react-icons/md";
import {
  PiClipboardThin,
  PiCopyThin,
  PiFloppyDiskThin,
  PiFolderOpenThin,
  PiGridFourThin,
  PiNoteThin,
  PiShareNetworkThin,
  PiTrashThin,
} from "react-icons/pi";

import { AutoLayoutMode } from "@/utils/auto-layout";

interface ToolbarProps {
  onToggleProperties: () => void;
  onToggleFullScreen: () => void;
  onSaveMindMap: () => void;
  onLoadMindMap: () => void;
  onDeleteNodeOrEdge: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onAddNote: () => void;
  onToggleGrid?: () => void;
  onAutoLayout?: (mode?: AutoLayoutMode) => void;
  autoLayoutMode: AutoLayoutMode;
}

export const Toolbar = ({
  onToggleProperties,
  onToggleFullScreen,
  onSaveMindMap,
  onLoadMindMap,
  onDeleteNodeOrEdge,
  onCopy,
  onPaste,
  onAddNote,
  onToggleGrid,
  onAutoLayout,
  autoLayoutMode,
}: ToolbarProps) => {
  const [isLayoutDialogOpen, setIsLayoutDialogOpen] = useState(false);

  const handleOpenLayoutDialog = () => {
    if (!onAutoLayout) return;

    setIsLayoutDialogOpen(true);
  };

  const handleCloseLayoutDialog = () => {
    setIsLayoutDialogOpen(false);
  };

  const handleSelectLayout = (mode: AutoLayoutMode) => {
    onAutoLayout?.(mode);
    setIsLayoutDialogOpen(false);
  };

  return (
    <AppBar
      className="bg-toolBar-background shadow-stone-500 shadow-md"
      elevation={0}
      position="sticky"
    >
      <MUIToolbar
        className="bg-toolBar-background border-b border-solid border-0 border-b-panels-border text-toolBar-text"
        variant="dense"
      >
        <Box
          className="flex-1 flex flex-nowrap text-toolBar-text"
          sx={{
            "& .MuiIconButton-root": {
              color: "var(--color-toolBar-text)",
            },
            "& .MuiIconButton-root:hover": {
              color: "var(--color-link-text)",
            },
          }}
        >
          <IconButton
            aria-label="Load mindmap"
            title="Load mindmap"
            onClick={() => {
              onLoadMindMap();
            }}
          >
            <PiFolderOpenThin />
          </IconButton>
          <IconButton
            aria-label="Save mindmap"
            size="medium"
            title="Save mindmap"
            onClick={() => {
              onSaveMindMap();
            }}
          >
            <PiFloppyDiskThin />
          </IconButton>
          <div className="h-6 my-4 mx-2 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
          <IconButton
            aria-label="Copy selected nodes"
            size="medium"
            title="Copy selected nodes"
            onClick={onCopy}
          >
            <PiCopyThin />
          </IconButton>
          <IconButton
            aria-label="Paste nodes"
            size="medium"
            title="Paste nodes"
            onClick={onPaste}
          >
            <PiClipboardThin />
          </IconButton>

          <div className="h-6 my-4 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
          <IconButton
            aria-label="Delete selected node or edge"
            size="medium"
            title="Delete selected node or edge"
            onClick={onDeleteNodeOrEdge}
          >
            <PiTrashThin />
          </IconButton>
          <IconButton
            aria-label="Add note"
            size="medium"
            title="Add note"
            onClick={onAddNote}
          >
            <PiNoteThin />
          </IconButton>
          <div className="h-6 my-4 pr-1 border-0 border-r border-panels-border border-solid inline-block" />
          <IconButton
            aria-label="Auto layout mindmap"
            disabled={!onAutoLayout}
            size="medium"
            title="Auto layout mindmap"
            onClick={handleOpenLayoutDialog}
          >
            <PiShareNetworkThin />
          </IconButton>
        </Box>
        <Box
          className="text-toolBar-text"
          sx={{
            flex: "1 1 auto",
            display: "flex",
            justifyContent: "flex-end",
            "& .MuiIconButton-root": {
              color: "var(--color-toolBar-text)",
            },
            "& .MuiIconButton-root:hover": {
              color: "var(--color-link-text)",
            },
          }}
        >
          <IconButton
            aria-label="Toggle grid"
            title="Toggle grid"
            onClick={onToggleGrid}
          >
            <PiGridFourThin />
          </IconButton>
          <IconButton
            aria-label="Toggle menubar"
            title="Toggle menubar"
            onClick={onToggleFullScreen}
          >
            <MdFullscreen />
          </IconButton>
          <IconButton
            aria-label="Toggle properties panel"
            title="Toggle properties panel"
            onClick={onToggleProperties}
          >
            <TbLayoutSidebarRightCollapseFilled />
          </IconButton>
        </Box>
      </MUIToolbar>
      <Dialog open={isLayoutDialogOpen} onClose={handleCloseLayoutDialog}>
        <DialogTitle>Select Auto Layout</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 2 }}>Choose how to arrange nodes.</Typography>
          <Stack spacing={1}>
            {(["horizontal", "vertical", "radial"] as AutoLayoutMode[]).map(
              (mode) => (
                <Button
                  key={mode}
                  fullWidth
                  disabled={!onAutoLayout}
                  variant={mode === autoLayoutMode ? "contained" : "outlined"}
                  onClick={() => handleSelectLayout(mode)}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Button>
              ),
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLayoutDialog}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};
