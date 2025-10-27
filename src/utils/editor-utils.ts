import { MindMapNode } from "@/model/types";

export interface OutlineItem {
  text: string;
  children: OutlineItem[];
}

export const ROOT_VERTICAL_SPACING = 160;
export const CHILD_VERTICAL_SPACING = 100;

export const getVerticalSpacingForDepth = (depth: number) =>
  depth <= 1 ? ROOT_VERTICAL_SPACING : CHILD_VERTICAL_SPACING;

export const parseOutlineText = (outline: string): OutlineItem[] => {
  const lines = outline
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "  ").replace(/\s+$/, ""));

  const rootItems: OutlineItem[] = [];
  const stack: { level: number; item: OutlineItem }[] = [];

  for (const rawLine of lines) {
    if (!rawLine.trim()) {
      continue;
    }

    const match = rawLine.match(/^(\s*)([-*+])\s+(.*)$/);

    if (!match) {
      const continuation = rawLine.trim();

      if (continuation && stack.length > 0) {
        const current = stack[stack.length - 1].item;

        current.text = `${current.text} ${continuation}`.trim();
      }

      continue;
    }

    const [, indent, , content] = match;
    const normalizedIndent = indent.replace(/\t/g, "  ");
    const level = Math.floor(normalizedIndent.length / 2);
    const text = content.trim();

    if (!text) {
      continue;
    }

    const item: OutlineItem = {
      text,
      children: [],
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      rootItems.push(item);
    } else {
      stack[stack.length - 1].item.children.push(item);
    }

    stack.push({ level, item });
  }

  return rootItems;
};

export const cleanNodesForStorage = (nodes: MindMapNode[]) => {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      showHandles: undefined,
      resizing: undefined,
      selected: undefined,
    },
  }));
};

export function updateSelectedNodeData(
  nodes: MindMapNode[],
  selectedNodeId: string | null,
  updater: (data: any) => any,
) {
  if (!selectedNodeId) return nodes;

  return nodes.map((node) =>
    node.id === selectedNodeId ? { ...node, data: updater(node.data) } : node,
  );
}
