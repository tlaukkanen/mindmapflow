"use client";

import { useEffect, useState, type MouseEvent } from "react";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { logger } from "@/services/logger";

interface ShareSummary {
  shareId: string;
  mindMapId: string;
  createdAt: string;
}

interface ManageSharesDialogProps {
  open: boolean;
  onClose: () => void;
  mindMapId?: string;
  refreshToken?: number;
}

export function ManageSharesDialog({
  open,
  onClose,
  mindMapId,
  refreshToken,
}: ManageSharesDialogProps) {
  const [shares, setShares] = useState<ShareSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadShares = async () => {
    if (!open) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = mindMapId
        ? `?mindMapId=${encodeURIComponent(mindMapId)}`
        : "";
      const response = await fetch(`/api/shares${params}`);

      if (response.status === 401) {
        setError("You need to sign in to manage share links.");

        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load share links");
      }

      const data = (await response.json()) as { shares: ShareSummary[] };

      setShares(data.shares ?? []);
    } catch (err) {
      logger.error("Failed to load share links", err);
      setError("Unable to load share links. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadShares();
    }
  }, [open, mindMapId, refreshToken]);

  const handleCopyShareLink = async (shareId: string) => {
    try {
      const shareUrl = `${window.location.origin}/shared/${shareId}`;

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch (err) {
      logger.error("Failed to copy share link", err);
      toast.error("Failed to copy share link");
    }
  };

  const handleRevokeShare = async (shareId: string, event: MouseEvent) => {
    event.stopPropagation();

    try {
      const response = await fetch(`/api/shares/${shareId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to revoke share link");
      }

      setShares((prev) => prev.filter((share) => share.shareId !== shareId));
      toast.success("Share link revoked");
    } catch (err) {
      logger.error("Failed to revoke share link", err);
      toast.error("Failed to revoke share link");
    }
  };

  const handleRefreshClick = () => {
    void loadShares();
  };

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onClose}>
      <DialogTitle className="flex items-center justify-between">
        <span>Manage share links</span>
        <IconButton aria-label="Refresh" onClick={handleRefreshClick}>
          <RefreshIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <div className="flex justify-center p-4">
            <CircularProgress size={24} />
          </div>
        ) : error ? (
          <Typography className="p-4 text-center text-muted">
            {error}
          </Typography>
        ) : shares.length === 0 ? (
          <Typography className="p-4 text-center text-muted">
            {mindMapId
              ? "You have not created public share links for this mindmap yet."
              : "You have not created any public share links yet."}
          </Typography>
        ) : (
          <List>
            {shares.map((share) => {
              const createdDate = share.createdAt
                ? new Date(share.createdAt)
                : null;
              const createdAgo =
                createdDate && !Number.isNaN(createdDate.getTime())
                  ? formatDistanceToNow(createdDate, { addSuffix: true })
                  : "an unknown time";
              const mindMapSuffix = mindMapId
                ? ""
                : ` • Mindmap: ${share.mindMapId}`;
              const secondaryText = `Created ${createdAgo}${mindMapSuffix}`;

              return (
                <ListItem key={share.shareId} disablePadding>
                  <ListItemButton
                    onClick={() => handleCopyShareLink(share.shareId)}
                  >
                    <ListItemText
                      primary={`/shared/${share.shareId}`}
                      secondary={secondaryText}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        aria-label="Copy link"
                        edge="end"
                        sx={{ mr: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleCopyShareLink(share.shareId);
                        }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        aria-label="Revoke link"
                        edge="end"
                        onClick={(event) =>
                          handleRevokeShare(share.shareId, event)
                        }
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
