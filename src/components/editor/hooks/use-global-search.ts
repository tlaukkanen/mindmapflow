import { useCallback, useEffect, useRef, useState } from "react";

import { MindMapNode } from "@/model/types";
import { logger } from "@/services/logger";

interface UseMindMapGlobalSearchArgs {
  nodes: MindMapNode[];
  selectedNodeIds: string[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  applySelection: (
    nextSelectedIds: string[],
    options?: { primaryId?: string | null; edgeId?: string | null },
  ) => void;
  setIsGlobalSearchActive: (isActive: boolean) => void;
}

interface PreviousSelection {
  ids: string[];
  primary: string | null;
  edgeId: string | null;
}

export const useMindMapGlobalSearch = ({
  nodes,
  selectedNodeIds,
  selectedNodeId,
  selectedEdgeId,
  applySelection,
  setIsGlobalSearchActive,
}: UseMindMapGlobalSearchArgs) => {
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const [globalSearchMatches, setGlobalSearchMatches] = useState<string[]>([]);
  const previousSelectionRef = useRef<PreviousSelection>({
    ids: [],
    primary: null,
    edgeId: null,
  });

  const applyGlobalSearchSelection = useCallback(
    (query: string) => {
      const normalized = query.trim().toLowerCase();

      if (!normalized) {
        setGlobalSearchMatches((prev) => (prev.length === 0 ? prev : []));
        const previous = previousSelectionRef.current;

        applySelection(previous.ids, {
          primaryId: previous.primary,
          edgeId: previous.edgeId,
        });

        return;
      }

      const tokens = normalized.split(/\s+/).filter(Boolean);
      const matches: string[] = [];

      nodes.forEach((node) => {
        const parts: string[] = [];
        const data = node.data;

        if (typeof data?.resourceName === "string") {
          parts.push(data.resourceName);
        }
        if (typeof data?.description === "string") {
          parts.push(data.description);
        }
        if (typeof data?.resourceType === "string") {
          parts.push(data.resourceType);
        }
        if (Array.isArray(data?.projectTags)) {
          parts.push(data.projectTags.join(" "));
        }

        if (parts.length === 0) {
          parts.push(node.id);
        }

        const haystack = parts.join(" ").toLowerCase();
        const isMatch = tokens.every((token) => haystack.includes(token));

        if (isMatch) {
          matches.push(node.id);
        }
      });

      setGlobalSearchMatches((prev) => {
        if (
          prev.length === matches.length &&
          prev.every((id, index) => id === matches[index])
        ) {
          return prev;
        }

        return matches;
      });

      applySelection(matches);
    },
    [applySelection, nodes],
  );

  useEffect(() => {
    if (!isGlobalSearchOpen) {
      return;
    }

    applyGlobalSearchSelection(globalSearchQuery);
  }, [applyGlobalSearchSelection, globalSearchQuery, isGlobalSearchOpen]);

  const handleSearchFocus = useCallback(() => {
    logger.info("Opening global search");
    previousSelectionRef.current = {
      ids: selectedNodeIds,
      primary: selectedNodeId,
      edgeId: selectedEdgeId,
    };
    setGlobalSearchQuery("");
    setGlobalSearchMatches((prev) => (prev.length === 0 ? prev : []));
    setIsGlobalSearchOpen(true);
    setIsGlobalSearchActive(true);
  }, [
    selectedEdgeId,
    selectedNodeId,
    selectedNodeIds,
    setIsGlobalSearchActive,
  ]);

  const handleGlobalSearchClose = useCallback(() => {
    const trimmed = globalSearchQuery.trim();

    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery("");
    setGlobalSearchMatches((prev) => (prev.length === 0 ? prev : []));
    setIsGlobalSearchActive(false);

    if (!trimmed) {
      const previous = previousSelectionRef.current;

      applySelection(previous.ids, {
        primaryId: previous.primary,
        edgeId: previous.edgeId,
      });
    }
  }, [applySelection, globalSearchQuery, setIsGlobalSearchActive]);

  const handleGlobalSearchSubmit = useCallback(() => {
    setIsGlobalSearchOpen(false);
    setGlobalSearchQuery("");
    setGlobalSearchMatches((prev) => (prev.length === 0 ? prev : []));
    setIsGlobalSearchActive(false);
  }, [setIsGlobalSearchActive]);

  const handleGlobalSearchQueryChange = useCallback((value: string) => {
    setGlobalSearchQuery(value);
  }, []);

  return {
    isGlobalSearchOpen,
    globalSearchQuery,
    globalSearchMatches,
    handleSearchFocus,
    handleGlobalSearchClose,
    handleGlobalSearchSubmit,
    handleGlobalSearchQueryChange,
  } as const;
};
