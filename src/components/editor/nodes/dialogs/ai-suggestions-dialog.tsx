"use client";

import type { AiSubnodeSuggestion } from "@/services/ai-suggestion-service";

import { useMemo } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";

interface AiSuggestionsDialogProps {
  open: boolean;
  parentTitle: string;
  suggestions: AiSubnodeSuggestion[] | null;
  onApprove: () => void;
  onCancel: () => void;
}

const countTotalSuggestions = (items: AiSubnodeSuggestion[]): number =>
  items.reduce(
    (total, item) =>
      total + 1 + (item.children ? countTotalSuggestions(item.children) : 0),
    0,
  );

const renderSuggestionTree = (
  items: AiSubnodeSuggestion[],
  depth = 0,
): JSX.Element[] =>
  items.map((item, index) => (
    <Box
      key={`${depth}-${index}-${item.title}`}
      sx={{ ml: depth * 2, mb: 1.5 }}
    >
      <Typography variant="subtitle2">&bull; {item.title}</Typography>
      {item.children && item.children.length > 0 && (
        <Box
          sx={{
            mt: 0.75,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {renderSuggestionTree(item.children, depth + 1)}
        </Box>
      )}
    </Box>
  ));

export function AiSuggestionsDialog({
  open,
  parentTitle,
  suggestions,
  onApprove,
  onCancel,
}: AiSuggestionsDialogProps) {
  const totalSuggestionCount = useMemo(() => {
    if (!suggestions || suggestions.length === 0) {
      return 0;
    }

    return countTotalSuggestions(suggestions);
  }, [suggestions]);

  const hasSuggestions = Boolean(suggestions && suggestions.length > 0);

  return (
    <Dialog fullWidth maxWidth="sm" open={open} onClose={onCancel}>
      <DialogTitle>Review AI Suggestions</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ mb: 1 }} variant="body2">
          {parentTitle
            ? `Review AI suggestions generated for "${parentTitle}".`
            : "Review AI suggestions."}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
          {totalSuggestionCount > 0
            ? `AI prepared ${totalSuggestionCount} new node${
                totalSuggestionCount === 1 ? "" : "s"
              }.`
            : "No nodes will be added."}
        </Typography>
        {hasSuggestions ? (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {renderSuggestionTree(suggestions)}
          </Box>
        ) : (
          <Typography color="text.secondary" variant="body2">
            No suggestions to display.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Discard</Button>
        <Button
          color="primary"
          disabled={!hasSuggestions}
          variant="contained"
          onClick={onApprove}
        >
          Add Suggestions
        </Button>
      </DialogActions>
    </Dialog>
  );
}
