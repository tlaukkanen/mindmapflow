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
  onAddNote?: () => void; // handler for creating a new note
  onOpenLinkDialog?: () => void; // handler for opening link dialog
  onToggleBold?: () => boolean | void; // handler for toggling bold formatting
  onToggleItalic?: () => boolean | void; // handler for toggling italic formatting
  onToggleUnderline?: () => boolean | void; // handler for toggling underline formatting
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
  onAddNote,
  onOpenLinkDialog,
  onToggleBold,
  onToggleItalic,
  onToggleUnderline,
}: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        const normalizedKey = event.key.toLowerCase();

        if (normalizedKey === "s") {
          event.preventDefault();
          onCtrlS?.();

          return;
        }

        if (normalizedKey === "b") {
          const handled = Boolean(onToggleBold?.());

          if (handled) {
            event.preventDefault();
          }

          return;
        }

        if (normalizedKey === "i") {
          const handled = Boolean(onToggleItalic?.());

          if (handled) {
            event.preventDefault();
          }

          return;
        }

        if (normalizedKey === "u") {
          const handled = Boolean(onToggleUnderline?.());

          if (handled) {
            event.preventDefault();
          }

          return;
        }
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
        case "n":
        case "N":
          if (event.ctrlKey || event.metaKey || event.altKey) {
            break;
          }
          event.preventDefault();
          onAddNote?.();
          break;
        case "l":
        case "L":
          if (event.ctrlKey || event.metaKey || event.altKey) {
            break;
          }
          event.preventDefault();
          onOpenLinkDialog?.();
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
            const modifierKeys = new Set(["Control", "Shift", "Alt", "Meta"]);

            if (!modifierKeys.has(event.key)) {
              logger.debug(
                `Unhandled keyboard shortcut: ${event.key} (ctrl: ${event.ctrlKey}, meta: ${event.metaKey})`,
              );
            }
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
      onAddNote,
      onOpenLinkDialog,
      onToggleBold,
      onToggleItalic,
      onToggleUnderline,
    ],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
