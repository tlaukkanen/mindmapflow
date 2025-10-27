import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  DialogActions,
  Button,
  Checkbox,
  ListItemIcon,
  Box,
  TextField,
  Chip,
  MenuItem,
} from "@mui/material";
import Skeleton from "react-loading-skeleton";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import { mindMapService } from "@/services/mindmap-service";
import { MindMapMetadata } from "@/lib/storage";
import { logger } from "@/services/logger";
import { MindMapNode } from "@/model/types";
import { useTheme } from "@/components/providers/ThemeProvider";

const normalizeTagsArray = (values: readonly unknown[]): string[] => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  values.forEach((value) => {
    if (typeof value !== "string") return;
    const trimmed = value.trim();

    if (!trimmed) return;

    const key = trimmed.toLowerCase();

    if (seen.has(key)) return;

    seen.add(key);
    normalized.push(trimmed);
  });

  return normalized;
};

interface OpenProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OpenProjectDialog({ open, onClose }: OpenProjectDialogProps) {
  const [mindMaps, setMindMaps] = useState<MindMapMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedMindMapIds, setSelectedMindMapIds] = useState<string[]>([]);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<"name" | "lastModified">("name");
  const router = useRouter();
  const { palette } = useTheme();

  const availableTags = useMemo(() => {
    const tags = new Set<string>();

    mindMaps.forEach((mindMap) => {
      mindMap.tags?.forEach((tag) => tags.add(tag));
    });

    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [mindMaps]);

  const filteredMindMaps = useMemo(() => {
    const byTag =
      tagFilter.length === 0
        ? mindMaps
        : mindMaps.filter((mindMap) => {
            const mapTags = mindMap.tags ?? [];

            return tagFilter.every((tag) =>
              mapTags.some(
                (mapTag) => mapTag.toLowerCase() === tag.toLowerCase(),
              ),
            );
          });

    return [...byTag].sort((a, b) => {
      if (sortOption === "lastModified") {
        return b.lastModified.getTime() - a.lastModified.getTime();
      }

      return a.name.localeCompare(b.name);
    });
  }, [mindMaps, sortOption, tagFilter]);

  useEffect(() => {
    if (open) {
      setSelectedMindMapIds([]);
      setTagFilter([]);
      setSortOption("name");
      loadMindMaps();
    } else {
      setSelectedMindMapIds([]);
      setTagFilter([]);
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

      const parsedMindMaps: MindMapMetadata[] = (
        Array.isArray(data) ? data : []
      )
        .map((item: any) => {
          const rawTags = Array.isArray(item?.tags) ? item.tags : [];
          const normalizedTags = normalizeTagsArray(rawTags);

          const parsedLastModified = new Date(item?.lastModified ?? Date.now());

          return {
            id: typeof item?.id === "string" ? item.id : nanoid(10),
            name: typeof item?.name === "string" ? item.name : "Untitled",
            lastModified: Number.isNaN(parsedLastModified.getTime())
              ? new Date()
              : parsedLastModified,
            tags: normalizedTags,
          } satisfies MindMapMetadata;
        })
        .sort((a, b) => a.name.localeCompare(b.name));

      setMindMaps(parsedMindMaps);
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
        tags: emptyProject.tags ?? [],
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
          {!loading && mindMaps.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1,
                mb: 2,
                alignItems: { sm: "center" },
              }}
            >
              <Autocomplete
                filterSelectedOptions
                freeSolo
                multiple
                options={availableTags}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Filter by tags"
                    placeholder={
                      availableTags.length > 0
                        ? "Select tags"
                        : "Type to filter"
                    }
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option.toLowerCase()}
                      label={option}
                      size="small"
                    />
                  ))
                }
                size="small"
                sx={{ flex: 1, minWidth: 0 }}
                value={tagFilter}
                onChange={(_, value) => {
                  setTagFilter(normalizeTagsArray(value));
                }}
              />
              <TextField
                select
                label="Sort by"
                size="small"
                sx={{ minWidth: 180 }}
                value={sortOption}
                onChange={(event) => {
                  setSortOption(event.target.value as "name" | "lastModified");
                }}
              >
                <MenuItem value="name">Name (A-Z)</MenuItem>
                <MenuItem value="lastModified">Last modified (newest)</MenuItem>
              </TextField>
            </Box>
          )}
          {loading ? (
            <List sx={{ py: 0 }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <ListItem
                  key={`mindmap-loading-${index}`}
                  disablePadding
                  sx={{ opacity: 0.85 }}
                >
                  <ListItemButton
                    disableRipple
                    sx={{
                      cursor: "default",
                      "&:hover": { backgroundColor: "transparent" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <Skeleton aria-hidden circle height={22} width={22} />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Skeleton aria-hidden height={20} width="60%" />}
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                            mt: 1,
                          }}
                        >
                          <Skeleton aria-hidden height={16} width="40%" />
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              flexWrap: "wrap",
                            }}
                          >
                            <Skeleton aria-hidden height={22} width={72} />
                            <Skeleton aria-hidden height={22} width={88} />
                          </Box>
                        </Box>
                      }
                      secondaryTypographyProps={{ component: "div" }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          ) : mindMaps.length === 0 ? (
            <Typography className="p-4 text-center text-muted">
              No mindmaps found
            </Typography>
          ) : filteredMindMaps.length === 0 ? (
            <Typography className="p-4 text-center text-muted">
              No mindmaps match the selected tags
            </Typography>
          ) : (
            <List>
              {filteredMindMaps.map((mindMap) => (
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
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            color="text.secondary"
                            component="span"
                            variant="body2"
                          >
                            Last modified: {format(mindMap.lastModified, "PPp")}
                          </Typography>
                          {mindMap.tags && mindMap.tags.length > 0 && (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                              }}
                            >
                              {mindMap.tags.map((tag) => (
                                <Chip
                                  key={`${mindMap.id}-${tag.toLowerCase()}`}
                                  label={tag}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                      secondaryTypographyProps={{ component: "div" }}
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
