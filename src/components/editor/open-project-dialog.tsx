import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  CircularProgress,
  Typography,
  IconButton,
  DialogActions,
  Button,
  ListItemSecondaryAction,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { mindMapService } from "@/services/mindmap-service";
import { MindMapMetadata } from "@/lib/storage";
import { logger } from "@/services/logger";
import { MindMapNode } from "@/model/types";
import { useTheme } from "@/components/providers/ThemeProvider";

interface OpenProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OpenProjectDialog({ open, onClose }: OpenProjectDialogProps) {
  const [mindMaps, setMindMaps] = useState<MindMapMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedMindMapId, setSelectedMindMapId] = useState<string | null>(
    null,
  );
  const router = useRouter();
  const { palette } = useTheme();

  useEffect(() => {
    if (open) {
      loadMindMaps();
    }
  }, [open]);

  const loadMindMaps = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/mindmaps/list");

      if (!response.ok) {
        throw new Error("Failed to load mindmaps");
      }
      const data = await response.json();

      setMindMaps(data);
    } catch (error) {
      logger.error("Error loading mindmaps:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMindMapSelect = (mindMapId: string) => {
    router.push(`/editor/${mindMapId}`);
    onClose();
  };

  const handleDeleteClick = (mindMapId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedMindMapId(mindMapId);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMindMapId) return;

    try {
      const response = await fetch(`/api/mindmaps/${selectedMindMapId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete mindmap");
      }

      setMindMaps(mindMaps.filter((m) => m.id !== selectedMindMapId));
    } catch (error) {
      logger.error("Error deleting mindmap:", error);
    } finally {
      setDeleteConfirmOpen(false);
      setSelectedMindMapId(null);
    }
  };

  const handleCopyMindMap = async (
    mindMapId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation();
    try {
      await mindMapService.copyMindMap(mindMapId);

      await loadMindMaps();
      toast.success("Mind map copied successfully");
    } catch (error) {
      logger.error("Error copying mindmap:", error);
      toast.error("Failed to copy mindmap");
    }
  };

  const handleNewProject = async () => {
    const newMindMapId = nanoid(10);
    const emptyProject = mindMapService.createEmptyMindmap();

    try {
      await mindMapService.saveMindMap({
        mindMapId: newMindMapId,
        nodes: emptyProject.nodes as MindMapNode[],
        edges: emptyProject.edges,
        lastModified: new Date(),
        paletteId: palette.id ?? emptyProject.paletteId,
        showGrid: emptyProject.showGrid ?? false,
      });

      router.push(`/editor/${newMindMapId}`);
      onClose();
    } catch (error) {
      logger.error("Error creating new mindmap:", error);
      toast.error("Failed to create new mindmap");
    }
  };

  return (
    <>
      <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
        <DialogTitle>Open Project</DialogTitle>
        <DialogContent>
          {loading ? (
            <div className="flex justify-center p-4">
              <CircularProgress />
            </div>
          ) : mindMaps.length === 0 ? (
            <Typography className="p-4 text-center text-muted">
              No mindmaps found
            </Typography>
          ) : (
            <List>
              {mindMaps
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((mindMap) => (
                  <ListItem key={mindMap.id} disablePadding>
                    <ListItemButton
                      onClick={() => handleMindMapSelect(mindMap.id)}
                    >
                      <ListItemText
                        primary={mindMap.name}
                        secondary={`Last modified: ${format(
                          new Date(mindMap.lastModified),
                          "PPp",
                        )}`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton
                          aria-label="copy"
                          edge="end"
                          sx={{ mr: 1 }}
                          onClick={(e) => handleCopyMindMap(mindMap.id, e)}
                        >
                          <ContentCopyIcon />
                        </IconButton>
                        <IconButton
                          aria-label="delete"
                          edge="end"
                          onClick={(e) => handleDeleteClick(mindMap.id, e)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewProject}>New Project</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Mind Map</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this mind map? This action cannot be
            undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button color="error" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
