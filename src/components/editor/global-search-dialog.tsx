"use client";

import { useCallback, useEffect, useRef, type KeyboardEvent } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";

interface GlobalSearchDialogProps {
  open: boolean;
  query: string;
  matchCount: number;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function GlobalSearchDialog({
  open,
  query,
  matchCount,
  onQueryChange,
  onClose,
  onSubmit,
}: GlobalSearchDialogProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSubmit();
      }

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    },
    [onClose, onSubmit],
  );

  const matchMessage = (() => {
    if (!query.trim()) {
      return "Start typing to highlight matching nodes.";
    }

    if (matchCount === 0) {
      return "No nodes match this search yet.";
    }

    return `${matchCount} match${matchCount === 1 ? "" : "es"} selected.`;
  })();

  return (
    <Dialog
      fullWidth
      keepMounted
      PaperProps={{
        sx: {
          mt: { xs: 4, sm: 8 },
        },
      }}
      maxWidth="sm"
      open={open}
      sx={{
        "& .MuiDialog-container": {
          alignItems: "flex-start",
        },
      }}
      onClose={onClose}
    >
      <DialogTitle>Search mind map</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          inputRef={inputRef}
          label="Search nodes"
          margin="dense"
          placeholder="Filter by title, description, or tags"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <Box sx={{ mt: 1.5 }}>
          <Typography color="text.secondary" variant="caption">
            {matchMessage}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ display: "block" }}
            variant="caption"
          >
            Press Enter to close search or Escape to cancel.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
