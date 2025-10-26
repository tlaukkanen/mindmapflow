import { useEffect, useState, type ChangeEvent } from "react";
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
  DialogActions,
  Button,
  Checkbox,
  ListItemIcon,
  Box,
} from "@mui/material";
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
  const [selectedMindMapIds, setSelectedMindMapIds] = useState<string[]>([]);
  const router = useRouter();
  const { palette } = useTheme();

  useEffect(() => {
    if (open) {
      setSelectedMindMapIds([]);
      loadMindMaps();
    } else {
      setSelectedMindMapIds([]);
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

  const handleToggleSelection = (
    mindMapId: string,
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    event.stopPropagation();
    setSelectedMindMapIds((prev) =>
      prev.includes(mindMapId)
        ? prev.filter((id) => id !== mindMapId)
        : [...prev, mindMapId],
    );
  };

  const handleClone = async () => {
    if (selectedMindMapIds.length !== 1) return;

    const mindMapId = selectedMindMapIds[0];

    try {
      await mindMapService.copyMindMap(mindMapId);

      await loadMindMaps();
      setSelectedMindMapIds([]);
      toast.success("Mind map copied successfully");
    } catch (error) {
      logger.error("Error copying mindmap:", error);
      toast.error("Failed to copy mindmap");
    }
  };

  const handleDeleteRequest = () => {
    if (selectedMindMapIds.length === 0) {
      return;
    }
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (selectedMindMapIds.length === 0) return;

    const idsToDelete = [...selectedMindMapIds];

    try {
      await Promise.all(
        idsToDelete.map(async (mindMapId) => {
          const response = await fetch(`/api/mindmaps/${mindMapId}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete mindmap");
          }
        }),
      );

      setMindMaps((prev) =>
        prev.filter((mindMap) => !idsToDelete.includes(mindMap.id)),
      );
      setSelectedMindMapIds([]);
      toast.success(
        idsToDelete.length === 1
          ? "Mind map deleted successfully"
          : "Mind maps deleted successfully",
      );
    } catch (error) {
      logger.error("Error deleting mindmap:", error);
      toast.error("Failed to delete mindmap");
    } finally {
      setDeleteConfirmOpen(false);
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
          <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
            Select projects to clone or delete. Click a row to open it.
          </Typography>
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
                      <ListItemIcon>
                        <Checkbox
                          disableRipple
                          checked={selectedMindMapIds.includes(mindMap.id)}
                          edge="start"
                          tabIndex={-1}
                          onChange={(event) =>
                            handleToggleSelection(mindMap.id, event)
                          }
                          onClick={(event) => event.stopPropagation()}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={mindMap.name}
                        secondary={`Last modified: ${format(
                          new Date(mindMap.lastModified),
                          "PPp",
                        )}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions
          sx={{ justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}
        >
          <Button variant="contained" onClick={handleNewProject}>
            Create new
          </Button>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              disabled={selectedMindMapIds.length !== 1}
              variant="outlined"
              onClick={handleClone}
            >
              Clone
            </Button>
            <Button
              color="error"
              disabled={selectedMindMapIds.length === 0}
              variant="outlined"
              onClick={handleDeleteRequest}
            >
              Delete
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Delete Mind Map</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the selected mind map
            {selectedMindMapIds.length > 1 ? "s" : ""}? This action cannot be
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
