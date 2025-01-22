import { useEffect, useCallback } from "react";

import { logger } from "@/services/logger";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onSearch?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onTab?: () => void;  // Add new handler
  onEnter?: () => void;  // Add new handler
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
}

export function useKeyboardShortcuts({
  onDelete,
  onSearch,
  onCopy,
  onPaste,
  onTab,   // Add new handler
  onEnter,  // Add new handler
  onArrowLeft,
  onArrowRight,
  onArrowUp,
  onArrowDown,
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
        case "Tab":  // Add Tab handler
          event.preventDefault();
          onTab?.();
          break;
        case "Enter":
          event.preventDefault();
          onEnter?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          onArrowLeft?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          onArrowRight?.();
          break;
        case "ArrowUp":
          event.preventDefault();
          onArrowUp?.();
          break;
        case "ArrowDown":
          event.preventDefault();
          onArrowDown?.();
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
    [onDelete, onSearch, onCopy, onPaste, onTab, onEnter, onArrowLeft, onArrowRight, onArrowUp, onArrowDown],  // Add onTab and onEnter to dependencies
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
