"use client";

import { memo, useCallback, useState } from "react";
import { useReactFlow, Edge } from "@xyflow/react";
import {
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import {
  PiTextB,
  PiTextItalic,
  PiTextUnderline,
  PiTextStrikethrough,
  PiSparkleFill,
} from "react-icons/pi";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

import type { AiSubnodeSuggestion } from "@/services/ai-suggestion-service";

const countTotalSuggestions = (items: AiSubnodeSuggestion[]): number =>
  items.reduce(
    (total, item) =>
      total + 1 + (item.children ? countTotalSuggestions(item.children) : 0),
    0,
  );

interface FormatToolbarProps {
  id: string;
}

export const FormatToolbar = memo(({ id }: FormatToolbarProps) => {
  const { data: session } = useSession();
  const { setNodes, setEdges, getNodes } = useReactFlow<MindMapNode>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingSuggestions, setPendingSuggestions] =
    useState<AiSubnodeSuggestion[] | null>(null);
  const [pendingParentId, setPendingParentId] = useState<string | null>(null);
  const [pendingParentTitle, setPendingParentTitle] = useState<string>("");

  // Remove the position styling from button styles as it's conflicting
  const buttonStyles = {
    padding: "4px",
    minWidth: "28px",
    minHeight: "28px",
    margin: "2px",
    backgroundColor: "white",
    "&:hover": {
      backgroundColor: "#f8fafc",
    },
  };

  const toolbarStyles = {
    position: "absolute" as const,
    top: "-48px",
    left: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    flexDirection: "row" as const,
    gap: "2px",
    backgroundColor: "white",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
    boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
    padding: "2px",
    zIndex: 9999,
  };

  // Define formatProperties to only include boolean properties
  type FormatProperty = "bold" | "italic" | "underline" | "strikethrough";

  const appendSuggestionsToMindmap = useCallback(
    (parentId: string, suggestions: AiSubnodeSuggestion[]) => {
      if (suggestions.length === 0) {
        return false;
      }

      const snapshot = getNodes();
      const parentNode = snapshot.find((node) => node.id === parentId);

      if (!parentNode) {
        logger.error("Unable to locate parent node when applying suggestions", {
          parentId,
        });

        return false;
      }

      const siblingsMap = new Map<string | undefined, MindMapNode[]>();

      for (const node of snapshot) {
        const parentKey = node.parentId ?? undefined;
        const existing = siblingsMap.get(parentKey);

        if (existing) {
          existing.push(node);
        } else {
          siblingsMap.set(parentKey, [node]);
        }
      }

      const newNodes: MindMapNode[] = [];
      const newEdges: Edge[] = [];

      const getSiblings = (key: string) => {
        const siblings = siblingsMap.get(key);

        if (siblings) {
          return siblings;
        }

        const empty: MindMapNode[] = [];
        siblingsMap.set(key, empty);

        return empty;
      };

      const createChildren = (
        parent: MindMapNode,
        items: AiSubnodeSuggestion[],
      ) => {
        if (!items.length) {
          return;
        }

        const parentDepth = parent.data.depth ?? 0;
        const verticalSpacing = parentDepth === 0 ? 160 : 100;
        const horizontalOffset = parentDepth === 0 ? 260 : 220;
        const siblings = getSiblings(parent.id);

        const baselineY =
          siblings.length > 0
            ? Math.max(...siblings.map((node) => node.position.y))
            : -verticalSpacing;

        let positionY = baselineY;

        items.forEach((item) => {
          positionY += verticalSpacing;
          const newNodeId = crypto.randomUUID();
          const textProperties = parent.data.textProperties
            ? {
                ...parent.data.textProperties,
                bold: false, // Ensure AI-generated nodes start without bold styling
              }
            : undefined;
          const newNode: MindMapNode = {
            id: newNodeId,
            type: parent.type ?? "rectangleShape",
            position: {
              x: horizontalOffset,
              y: positionY,
            },
            data: {
              description: item.title,
              resourceType: parent.data.resourceType ?? "generic",
              textProperties,
              depth: parentDepth + 1,
              lastDirection: "right",
            },
            parentId: parent.id,
            selected: false,
          };

          newNodes.push(newNode);
          siblings.push(newNode);

          newEdges.push({
            id: `e-${parent.id}-${newNodeId}`,
            source: parent.id,
            target: newNodeId,
            sourceHandle: `${parent.id}-right-source`,
            targetHandle: `${newNodeId}-left-target`,
            type: "default",
          });

          if (item.children && item.children.length > 0) {
            createChildren(newNode, item.children);
          }
        });
      };

      createChildren(parentNode, suggestions);

      if (newNodes.length === 0) {
        return false;
      }

      setNodes((prev) => [...prev, ...newNodes]);
      setEdges((prev) => [...prev, ...newEdges]);

      return true;
    },
    [getNodes, setEdges, setNodes],
  );

  const handleAiSuggestions = useCallback(async () => {
    if (isGenerating || isDialogOpen) return;

    setIsGenerating(true);

    try {
      const nodes = getNodes();
      const parentNode = nodes.find((node) => node.id === id);

      if (!parentNode) {
        toast.error("Unable to locate the selected node");

        return;
      }

      const parentDescription = parentNode.data.description?.trim();

      if (!parentDescription) {
        toast.info("Please add some text to the node before requesting AI help");

        return;
      }

      const parentDisplayTitle = parentDescription.replace(/\s+/g, " ");

      const existingChildren = nodes
        .filter((node) => node.parentId === id)
        .map((node) => node.data?.description?.trim())
        .filter((value): value is string => Boolean(value && value.length));

      const mindmapNodes = nodes
        .map((node) => {
          const description = node.data?.description;

          if (typeof description !== "string") {
            return undefined;
          }

          const cleaned = description.replace(/\s+/g, " ").trim();

          if (!cleaned) {
            return undefined;
          }

          return {
            id: node.id,
            parentId: node.parentId ?? null,
            description: cleaned,
          };
        })
        .filter(
          (value): value is { id: string; parentId: string | null; description: string } =>
            Boolean(value),
        );

      const response = await fetch("/api/ai-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nodeDescription: parentDescription,
          existingChildren,
          mindmap: {
            nodes: mindmapNodes,
          },
        }),
      });

      if (response.status === 401) {
        toast.error("Please sign in to use AI assistance");

        return;
      }

      if (!response.ok) {
        toast.error("AI suggestion request failed");

        return;
      }

      const data = (await response.json()) as {
        suggestions?: AiSubnodeSuggestion[];
      };
      const suggestions = Array.isArray(data.suggestions)
        ? data.suggestions.filter((item) =>
            typeof item?.title === "string" && item.title.trim().length,
          )
        : [];

      if (suggestions.length === 0) {
        toast.info("No suggestions received for this node");

        return;
      }

      setPendingParentId(parentNode.id);
      setPendingParentTitle(parentDisplayTitle);
      setPendingSuggestions(suggestions);
      setIsDialogOpen(true);
    } catch (error) {
      logger.error("Failed to handle AI suggestions", error);
      toast.error("Failed to generate AI suggestions");
    } finally {
      setIsGenerating(false);
    }
  }, [getNodes, id, isDialogOpen, isGenerating]);

  const resetSuggestionDialog = () => {
    setIsDialogOpen(false);
    setPendingSuggestions(null);
    setPendingParentId(null);
    setPendingParentTitle("");
  };

  const handleDialogCancel = () => {
    resetSuggestionDialog();
    toast.info("AI suggestions discarded");
  };

  const handleDialogApprove = () => {
    if (!pendingParentId || !pendingSuggestions) {
      resetSuggestionDialog();
      toast.error("Unable to add AI suggestions");

      return;
    }

    const success = appendSuggestionsToMindmap(
      pendingParentId,
      pendingSuggestions,
    );

    resetSuggestionDialog();

    if (success) {
      toast.success("AI suggestions added to the mindmap");
    } else {
      toast.error("Unable to add AI suggestions");
    }
  };

  const renderSuggestionTree = (
    items: AiSubnodeSuggestion[],
    depth = 0,
  ): JSX.Element[] =>
    items.map((item, index) => (
      <Box key={`${depth}-${index}-${item.title}`} sx={{ ml: depth * 2, mb: 1.5 }}>
        <Typography variant="subtitle2">&bull; {item.title}</Typography>
        {item.children && item.children.length > 0 && (
          <Box sx={{ mt: 0.75, display: "flex", flexDirection: "column", gap: 1 }}>
            {renderSuggestionTree(item.children, depth + 1)}
          </Box>
        )}
      </Box>
    ));

  const totalSuggestionCount = pendingSuggestions
    ? countTotalSuggestions(pendingSuggestions)
    : 0;

  const handleFormatChange = (property: FormatProperty) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === id) {
          const textProperties = node.data.textProperties || {};

          return {
            ...node,
            data: {
              ...node.data,
              textProperties: {
                ...textProperties,
                [property]: !textProperties[property],
              },
            },
          };
        }

        return node;
      }),
    );
  };

  return (
    <div style={toolbarStyles}>
      <Tooltip title="Bold">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("bold")}
        >
          <PiTextB className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Italic">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("italic")}
        >
          <PiTextItalic className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Underline">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("underline")}
        >
          <PiTextUnderline className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Strikethrough">
        <IconButton
          size="small"
          sx={buttonStyles}
          onClick={() => handleFormatChange("strikethrough")}
        >
          <PiTextStrikethrough className="w-4 h-4" />
        </IconButton>
      </Tooltip>
      <Tooltip
        title={
          session
            ? isGenerating
              ? "Generating AI suggestions..."
              : "Ask AI to suggest child topics"
            : "Sign in to use AI suggestions"
        }
      >
        <span>
          <IconButton
            size="small"
            sx={buttonStyles}
            disabled={!session || isGenerating || isDialogOpen}
            onClick={handleAiSuggestions}
          >
            <PiSparkleFill className="w-4 h-4" />
          </IconButton>
        </span>
      </Tooltip>
      <Dialog
        fullWidth
        maxWidth="sm"
        open={isDialogOpen}
        onClose={handleDialogCancel}
      >
        <DialogTitle>Review AI Suggestions</DialogTitle>
        <DialogContent dividers>
          <Typography sx={{ mb: 1 }} variant="body2">
            {pendingParentTitle
              ? `Review AI suggestions generated for "${pendingParentTitle}".`
              : "Review AI suggestions."}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }} variant="body2">
            {totalSuggestionCount > 0
              ? `AI prepared ${totalSuggestionCount} new node${
                  totalSuggestionCount === 1 ? "" : "s"
                }.`
              : "No nodes will be added."}
          </Typography>
          {pendingSuggestions && pendingSuggestions.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {renderSuggestionTree(pendingSuggestions)}
            </Box>
          ) : (
            <Typography color="text.secondary" variant="body2">
              No suggestions to display.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogCancel}>Discard</Button>
          <Button
            color="primary"
            disabled={!pendingSuggestions || pendingSuggestions.length === 0}
            onClick={handleDialogApprove}
            variant="contained"
          >
            Add Suggestions
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
});

FormatToolbar.displayName = "FormatToolbar";
