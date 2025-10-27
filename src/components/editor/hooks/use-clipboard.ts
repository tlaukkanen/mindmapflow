import { Dispatch, SetStateAction, useCallback, useState } from "react";
import { Edge } from "@xyflow/react";
import { toast } from "sonner";

import { MindMapNode } from "@/model/types";

interface UseMindMapClipboardArgs {
  nodes: MindMapNode[];
  edges: Edge[];
  setNodes: Dispatch<SetStateAction<MindMapNode[]>>;
  setEdges: Dispatch<SetStateAction<Edge[]>>;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedNodeIds: (nodeIds: string[]) => void;
}

export const useMindMapClipboard = ({
  nodes,
  edges,
  setNodes,
  setEdges,
  setSelectedNodeId,
  setSelectedNodeIds,
}: UseMindMapClipboardArgs) => {
  const [copiedNodes, setCopiedNodes] = useState<MindMapNode[]>([]);
  const [pasteCount, setPasteCount] = useState(0);

  const handleCopy = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);

    if (selectedNodes.length > 0) {
      setCopiedNodes(selectedNodes);
      setPasteCount(0);
      toast.success(
        `Copied ${selectedNodes.length} node${selectedNodes.length > 1 ? "s" : ""}`,
      );
    }
  }, [nodes]);

  const handlePaste = useCallback(() => {
    if (copiedNodes.length === 0) return;

    setNodes((prev) =>
      prev.map((node) => (node.selected ? { ...node, selected: false } : node)),
    );

    const idMapping = new Map<string, string>();

    const newNodes = copiedNodes.map((node) => {
      const newId = crypto.randomUUID();

      idMapping.set(node.id, newId);

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + 20 * (pasteCount + 1),
          y: node.position.y + 20 * (pasteCount + 1),
        },
        selected: true,
      } as MindMapNode;
    });

    const newEdges = edges
      .filter((edge) => copiedNodes.some((node) => node.id === edge.target))
      .map((edge) => {
        const newTarget = idMapping.get(edge.target)!;
        const newSource = idMapping.get(edge.source) || edge.source;

        return {
          ...edge,
          id: `e-${newSource}-${newTarget}`,
          source: newSource,
          target: newTarget,
          sourceHandle: edge.sourceHandle?.replace(edge.source, newSource),
          targetHandle: edge.targetHandle?.replace(edge.target, newTarget),
        };
      });

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
    setPasteCount((count) => count + 1);

    if (newNodes.length > 0) {
      const lastNodeId = newNodes[newNodes.length - 1].id;

      setSelectedNodeId(lastNodeId);
      setSelectedNodeIds(newNodes.map((node) => node.id));
    }

    toast.success(
      `Pasted ${newNodes.length} node${newNodes.length > 1 ? "s" : ""}`,
    );
  }, [
    copiedNodes,
    edges,
    pasteCount,
    setEdges,
    setNodes,
    setSelectedNodeId,
    setSelectedNodeIds,
  ]);

  return {
    handleCopy,
    handlePaste,
    copiedNodes,
  } as const;
};
