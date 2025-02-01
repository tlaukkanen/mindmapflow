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
} from "@mui/material";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { MindMapMetadata } from "@/lib/storage";
import { logger } from "@/services/logger";

interface OpenProjectDialogProps {
  open: boolean;
  onClose: () => void;
}

export function OpenProjectDialog({ open, onClose }: OpenProjectDialogProps) {
  const [mindMaps, setMindMaps] = useState<MindMapMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle>Open Project</DialogTitle>
      <DialogContent>
        {loading ? (
          <div className="flex justify-center p-4">
            <CircularProgress />
          </div>
        ) : mindMaps.length === 0 ? (
          <Typography className="p-4 text-center text-gray-500">
            No mindmaps found
          </Typography>
        ) : (
          <List>
            {mindMaps.map((mindMap) => (
              <ListItem key={mindMap.id} disablePadding>
                <ListItemButton onClick={() => handleMindMapSelect(mindMap.id)}>
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
    </Dialog>
  );
}
