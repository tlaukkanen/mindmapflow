import { useEffect, useCallback } from "react";

import { logger } from "@/services/logger";

interface KeyboardShortcutHandlers {
  onDelete?: () => void;
  onSearch?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  onTab?: () => void; // Add new handler
  onEnter?: () => void; // Add new handler
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onSpace?: () => void; // Add new handler
  onEscape?: () => void; // Add new handler
  onCtrlS?: () => void; // new handler for CTRL+s
}

export function useKeyboardShortcuts({
  onDelete,
  onSearch,
  onCopy,
  onPaste,
  onTab, // Add new handler
  onEnter, // Add new handler
  onArrowLeft,
  onArrowRight,
  onArrowUp,
  onArrowDown,
  onSpace, // Add new handler
  onEscape, // Add new handler
  onCtrlS, // new handler
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle CTRL+s for save
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        onCtrlS?.();

        return;
      }

      // Allow Escape key even in input fields
      if (
        event.key !== "Escape" &&
        (event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement)
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
        case "Tab": // Add Tab handler
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
        case " ": // Add Space handler
          event.preventDefault();
          onSpace?.();
          break;
        case "Escape": // Add Escape handler
          event.preventDefault();
          onEscape?.();
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
    [
      onDelete,
      onSearch,
      onCopy,
      onPaste,
      onTab,
      onEnter,
      onArrowLeft,
      onArrowRight,
      onArrowUp,
      onArrowDown,
      onSpace,
      onEscape,
      onCtrlS,
    ], // Add onTab, onEnter, and onEscape to dependencies
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
