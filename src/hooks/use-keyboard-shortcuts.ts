import { useEffect, useCallback } from "react";

import { logger } from "@/services/logger";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onSearch?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
}

export function useKeyboardShortcuts({
  onDelete,
  onSearch,
  onCopy,
  onPaste,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore if focus is in an input field
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (event.key) {
        case "Delete":
          onDelete?.();
          break;
        case "/":
          event.preventDefault();
          onSearch?.();
          break;
        default:
          // Handle Copy & Paste
          if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "c"
          ) {
            event.preventDefault();
            onCopy?.();
          } else if (
            (event.ctrlKey || event.metaKey) &&
            event.key.toLowerCase() === "v"
          ) {
            event.preventDefault();
            onPaste?.();
          } else {
            logger.debug(
              `Unhandled keyboard shortcut: ${event.key} (ctrl: ${event.ctrlKey}, meta: ${event.metaKey})`,
            );
          }
          break;
      }
    },
    [onDelete, onSearch, onCopy, onPaste],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
