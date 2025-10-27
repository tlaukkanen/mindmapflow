"use client";

import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
  Box,
} from "@mui/material";
import {
  useCallback,
  useEffect,
  useRef,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";

interface TagDialogProps {
  open: boolean;
  pendingTags: string[];
  tagInput: string;
  canSave: boolean;
  onClose: () => void;
  onSave: () => void;
  onTagAdd: () => void;
  onTagRemove: (tag: string) => void;
  onRemoveLastTag: () => void;
  onTagInputChange: (value: string) => void;
}

export function TagDialog({
  open,
  pendingTags,
  tagInput,
  canSave,
  onClose,
  onSave,
  onTagAdd,
  onTagRemove,
  onRemoveLastTag,
  onTagInputChange,
}: TagDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onTagInputChange(event.target.value);
    },
    [onTagInputChange],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        if (tagInput.trim()) {
          event.preventDefault();
          onTagAdd();
        } else if (canSave) {
          event.preventDefault();
          onSave();
        }

        return;
      }

      if (event.key === ",") {
        event.preventDefault();
        onTagAdd();

        return;
      }

      if (event.key === "Backspace" && !tagInput && pendingTags.length) {
        event.preventDefault();
        onRemoveLastTag();
      }
    },
    [canSave, onRemoveLastTag, onSave, onTagAdd, pendingTags.length, tagInput],
  );

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle>Edit Project Tags</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 1 }} variant="body2">
          Tags help with organizing and filtering your mind maps.
        </Typography>
        <TextField
          fullWidth
          inputRef={inputRef}
          label="Add tag"
          margin="dense"
          placeholder="Press Enter to add"
          size="small"
          value={tagInput}
          onBlur={onTagAdd}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <Box className="flex flex-wrap gap-1 mt-2">
          {pendingTags.map((tag) => (
            <Chip
              key={tag.toLowerCase()}
              label={tag}
              size="small"
              variant="outlined"
              onDelete={() => onTagRemove(tag)}
            />
          ))}
        </Box>
        {pendingTags.length === 0 && (
          <Typography color="text.secondary" sx={{ mt: 1 }} variant="caption">
            Add tags to help organize your projects.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button disabled={!canSave} variant="contained" onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
