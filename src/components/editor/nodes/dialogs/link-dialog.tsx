"use client";

import {
  useCallback,
  type ChangeEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

interface LinkDialogProps {
  open: boolean;
  hasExistingLink: boolean;
  linkValue: string;
  linkError: string | null;
  inputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onRemove: () => void;
  onSave: () => void;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function LinkDialog({
  open,
  hasExistingLink,
  linkValue,
  linkError,
  inputRef,
  onClose,
  onRemove,
  onSave,
  onChange,
}: LinkDialogProps) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        onSave();
      }
    },
    [onSave],
  );

  return (
    <Dialog fullWidth maxWidth="xs" open={open} onClose={onClose}>
      <DialogTitle>{hasExistingLink ? "Edit Link" : "Add Link"}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          error={Boolean(linkError)}
          helperText={
            linkError ??
            "HTTP or HTTPS links are supported. We'll add https:// when missing."
          }
          inputRef={inputRef}
          label="URL"
          margin="dense"
          placeholder="https://example.com"
          type="url"
          value={linkValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
        />
      </DialogContent>
      <DialogActions>
        {hasExistingLink && (
          <Button color="error" onClick={onRemove}>
            Remove Link
          </Button>
        )}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onSave}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
