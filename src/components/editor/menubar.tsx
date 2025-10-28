"use client";

import type { MindMapNode } from "@/model/types";

import {
  AppBar,
  Toolbar as MUIToolbar,
  Box,
  Typography,
  Button,
  Link,
  Menu,
  MenuItem,
  IconButton,
  Divider,
} from "@mui/material";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Image from "next/image";
import React, { useState, useEffect } from "react"; // Modified import: added useEffect
import { toast } from "sonner";
import { useReactFlow } from "@xyflow/react";
import { signIn, signOut, useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { PiUser } from "react-icons/pi";

import { OpenProjectDialog } from "./open-project-dialog";
import { ManageSharesDialog } from "./manage-shares-dialog";

import { useEditor } from "@/store/editor-context";
import { logger } from "@/services/logger";
import { getHasUnsavedChanges } from "@/hooks/use-auto-save";
import { ThemeSelector } from "@/components/theme-selector";
import { MindmapExportError, renderMindmapToPng } from "@/utils/mindmap-export";

interface MenubarProps {
  onNewProject: () => void;
  onCopyJsonToClipboard: () => void;
  onClearSelection: () => void;
}

export const Menubar = ({
  onNewProject,
  onCopyJsonToClipboard,
  onClearSelection,
}: MenubarProps) => {
  const { getNodes } = useReactFlow();
  const { isFullScreen } = useEditor(); // Modified: removed editorVersion
  const [isSaved, setIsSaved] = useState<boolean>(true); // New state for save status
  const [savedTimestamp, setSavedTimestamp] = useState<Date | null>(null); // New state for saved timestamp
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [editAnchorEl, setEditAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const [profileAchorEl, setProfileAnchorEl] =
    React.useState<null | HTMLElement>(null);
  const [themeAnchorEl, setThemeAnchorEl] = React.useState<null | HTMLElement>(
    null,
  );
  const [openProjectDialogOpen, setOpenProjectDialogOpen] = useState(false);
  const [manageSharesDialogOpen, setManageSharesDialogOpen] = useState(false);
  const [sharesRefreshToken, setSharesRefreshToken] = useState(0);
  const [baseDocumentTitle, setBaseDocumentTitle] = useState("MindMapFlow");
  const projectMenuOpen = Boolean(anchorEl);
  const editMenuOpen = Boolean(editAnchorEl);
  const profileMenuOpen = Boolean(profileAchorEl);
  const themeMenuOpen = Boolean(themeAnchorEl);
  const { data: session } = useSession();
  const params = useParams();
  const mindMapId = (params?.id as string | undefined) ?? undefined;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const readBaseTitle = () => {
      const current = window.__MINDMAPFLOW_BASE_TITLE__;

      if (typeof current === "string" && current.trim().length > 0) {
        return current;
      }

      return "MindMapFlow";
    };

    const handleTitleChange = (event: Event) => {
      const customEvent = event as CustomEvent<string>;
      const detail =
        typeof customEvent.detail === "string" ? customEvent.detail : undefined;
      const nextTitle =
        detail && detail.trim().length > 0 ? detail : readBaseTitle();

      setBaseDocumentTitle((prev) => (prev === nextTitle ? prev : nextTitle));
    };

    setBaseDocumentTitle(readBaseTitle());
    window.addEventListener("mindmapflow:title-changed", handleTitleChange);

    return () => {
      window.removeEventListener(
        "mindmapflow:title-changed",
        handleTitleChange,
      );
    };
  }, []);

  // Update saved status whenever hasUnsavedChanges changes
  useEffect(() => {
    const updateSavedStatus = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>;

      logger.debug("Unsaved changes status changed", {
        hasUnsavedChanges: customEvent.detail,
      });
      setIsSaved(!customEvent.detail);
    };

    // Initial check - call the function to get the current value
    const initialHasUnsavedChanges = getHasUnsavedChanges();

    logger.debug("Initial unsaved changes check", {
      hasUnsavedChanges: initialHasUnsavedChanges,
    });
    setIsSaved(!initialHasUnsavedChanges);

    // Listen for changes
    window.addEventListener("unsavedChangesChanged", updateSavedStatus);

    return () => {
      window.removeEventListener("unsavedChangesChanged", updateSavedStatus);
    };
  }, []); // Empty dependency array since we want this to run once on mount

  // Handle auto-save event
  useEffect(() => {
    const handleAutoSave = (event: Event) => {
      const customEvent = event as CustomEvent<Date>;

      logger.debug("Auto-save event received", {
        timestamp: customEvent.detail,
      });
      setSavedTimestamp(customEvent.detail);
      setIsSaved(true); // Explicitly set saved state to true when auto-save occurs
    };

    window.addEventListener("saved", handleAutoSave);

    return () => {
      window.removeEventListener("saved", handleAutoSave);
    };
  }, []);

  // Update document title based on save status
  useEffect(() => {
    const title = !isSaved
      ? `${baseDocumentTitle} (Unsaved Changes)`
      : baseDocumentTitle;

    document.title = title;

    return () => {
      document.title = baseDocumentTitle;
    };
  }, [isSaved, baseDocumentTitle]);

  // Add beforeunload event handler
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSaved) {
        e.preventDefault();
        e.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";

        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSaved]);

  // Add navigation guard for Next.js client-side navigation
  useEffect(() => {
    const handleBeforeRouteChange = (_url: string) => {
      if (
        !isSaved &&
        !window.confirm(
          "You have unsaved changes. Are you sure you want to leave?",
        )
      ) {
        // Cancel navigation
        window.history.pushState(null, "", window.location.href);
        throw "Navigation cancelled";
      }
    };

    window.addEventListener("popstate", () =>
      handleBeforeRouteChange(window.location.href),
    );

    return () =>
      window.removeEventListener("popstate", () =>
        handleBeforeRouteChange(window.location.href),
      );
  }, [isSaved]);

  const handleProjectMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    onClearSelection();
    setAnchorEl(event.currentTarget);
  };

  const handleEditMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    onClearSelection();
    setEditAnchorEl(event.currentTarget);
  };
  const handleProfileMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    onClearSelection();
    setProfileAnchorEl(event.currentTarget);
  };
  const handleThemeMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onClearSelection();
    setThemeAnchorEl(event.currentTarget);
  };
  const handleThemeMenuKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (
      event.key === "ArrowRight" ||
      event.key === "Enter" ||
      event.key === " "
    ) {
      event.preventDefault();
      onClearSelection();
      setThemeAnchorEl(event.currentTarget as HTMLElement);
    }
  };
  const handleThemeMenuClose = () => {
    setThemeAnchorEl(null);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
    setEditAnchorEl(null);
    setProfileAnchorEl(null);
    setThemeAnchorEl(null);
  };

  const downloadImage = (dataUrl: string) => {
    const a = document.createElement("a");

    a.setAttribute("download", "MindMapFlow.png");
    a.setAttribute("href", dataUrl);
    a.click();
  };

  const handleCreatePublicShare = async () => {
    if (!mindMapId) {
      toast.error("No project ID found");

      return;
    }

    const nodes = getNodes() as MindMapNode[];
    let shareTitle: string | undefined;
    let thumbnailDataUrl: string | undefined;

    if (nodes.length > 0) {
      const rootNode =
        nodes.find((node) => node.id === "root") ||
        nodes.find((node) => (node.data.depth ?? 0) === 0);
      const candidateTitle = rootNode?.data?.description?.trim();

      if (candidateTitle && candidateTitle.length > 0) {
        shareTitle = candidateTitle;
      }

      try {
        const { dataUrl } = await renderMindmapToPng(nodes, {
          logger,
          pixelRatio: 1.25,
        });

        thumbnailDataUrl = dataUrl;
      } catch (error) {
        if (error instanceof MindmapExportError) {
          logger.warn("Unable to render share thumbnail", {
            code: error.code,
          });
        } else {
          logger.warn("Unexpected error rendering share thumbnail", error);
        }
      }
    }

    const shareToastId = toast.loading("Creating share link...");

    try {
      const payload: Record<string, unknown> = { mindMapId };

      if (shareTitle) {
        payload.title = shareTitle;
      }

      if (thumbnailDataUrl) {
        payload.thumbnailDataUrl = thumbnailDataUrl;
      }

      const response = await fetch("/api/shares", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message =
          response.status === 404
            ? "Mindmap not found"
            : "Failed to create share link";

        toast.error(message);

        return;
      }

      const { shareId, title: responseTitle } = (await response.json()) as {
        shareId: string;
        title?: string;
      };
      const shareUrl = `${window.location.origin}/shared/${shareId}`;
      const successTitle =
        responseTitle && responseTitle.length > 0 ? responseTitle : shareTitle;

      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success(
          successTitle
            ? `Share link copied for "${successTitle}"`
            : "Share link copied to clipboard",
        );
      } catch (clipboardError) {
        logger.warn("Failed to copy share link to clipboard", clipboardError);
        toast.success(
          successTitle
            ? `Share link ready for "${successTitle}"`
            : "Share link ready",
        );
        toast.info("Copy link", {
          description: shareUrl,
        });
      }
      setSharesRefreshToken((value) => value + 1);
    } catch (error) {
      logger.error("Failed to create public share", error);
      toast.error("Failed to create share link");
    } finally {
      toast.dismiss(shareToastId);
    }
  };

  const handleCopyAsImage = () => {
    handleMenuClose();
    const nodes = getNodes() as MindMapNode[];

    if (nodes.length === 0) {
      toast.info("Nothing to export yet");

      return;
    }

    renderMindmapToPng(nodes, { logger })
      .then(({ dataUrl, width, height }) => {
        downloadImage(dataUrl);
        toast.success(`Downloading image: ${width}x${height}`);
      })
      .catch((error) => {
        if (error instanceof MindmapExportError) {
          if (error.code === "mindmap-export/bounds") {
            toast.error("Unable to calculate diagram size");

            return;
          }

          if (error.code === "mindmap-export/element-not-found") {
            toast.error("Mindmap canvas not found");

            return;
          }

          if (error.code === "mindmap-export/no-nodes") {
            toast.info("Nothing to export yet");

            return;
          }
        }

        logger.error("Failed to export image", error);
        toast.error("Export failed. Please try again.");
      });
  };

  if (isFullScreen) {
    return null;
  }

  return (
    <>
      <AppBar
        className="bg-menuBar-background shadow-stone-800 shadow-md text-panels-text border-b border-solid border-0 border-panels-border"
        elevation={0}
        position="sticky"
      >
        <MUIToolbar
          className="bg-menuBar-background border-b  border-b-panels-border text-menuBar-text pl-3"
          variant="dense"
        >
          <Box
            sx={{
              flex: "2 1 auto",
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Link
              className="flex justify-start items-center gap-1 text-prussianBlue"
              href="/"
              underline="none"
            >
              <Image
                alt="Logo"
                className="w-6 h-6 object-contain"
                height={22}
                src="/app_icon.svg"
                width={26}
              />
              <Box width={2} />
              <Typography className="hidden sm:block font-extrabold text-menuBar-text">
                MindMapFlow
              </Typography>
            </Link>
            <div className="flex gap-0">
              <Button
                className="text-xs"
                color="inherit"
                size="small"
                onClick={handleProjectMenuClick}
              >
                Project
              </Button>
              <Menu
                MenuListProps={{
                  "aria-labelledby": "project-menu",
                }}
                anchorEl={anchorEl}
                id="project-menu"
                open={projectMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    onNewProject();
                    handleMenuClose();
                  }}
                >
                  New Project
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    setOpenProjectDialogOpen(true);
                  }}
                >
                  Open Project
                </MenuItem>
                <Divider component="li" sx={{ my: 0.5 }} />
                <MenuItem
                  disabled={!session}
                  onClick={() => {
                    handleCreatePublicShare();
                    handleMenuClose();
                  }}
                >
                  Share public link
                </MenuItem>
                <MenuItem
                  disabled={!session || !mindMapId}
                  onClick={() => {
                    setManageSharesDialogOpen(true);
                    handleMenuClose();
                  }}
                >
                  Manage share links
                </MenuItem>
                <Divider component="li" sx={{ my: 0.5 }} />
                <MenuItem onClick={handleCopyAsImage}>Export as image</MenuItem>
                <Divider component="li" sx={{ my: 0.5 }} />
                <MenuItem
                  aria-controls={
                    themeMenuOpen ? "project-theme-menu" : undefined
                  }
                  aria-expanded={themeMenuOpen ? "true" : undefined}
                  aria-haspopup="true"
                  id="project-theme-menu-item"
                  onClick={handleThemeMenuOpen}
                  onKeyDown={handleThemeMenuKeyDown}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      gap: 1,
                    }}
                  >
                    <Typography variant="inherit">Project theme</Typography>
                    <KeyboardArrowRightIcon
                      fontSize="small"
                      sx={{ ml: "auto" }}
                    />
                  </Box>
                </MenuItem>
              </Menu>
              <Menu
                MenuListProps={{
                  "aria-labelledby": "project-theme-menu-item",
                  sx: { py: 1 },
                }}
                anchorEl={themeAnchorEl}
                anchorOrigin={{ horizontal: "right", vertical: "top" }}
                id="project-theme-menu"
                open={themeMenuOpen}
                transformOrigin={{ horizontal: "left", vertical: "top" }}
                onClose={handleThemeMenuClose}
              >
                <Box sx={{ width: 280, px: 1.5, py: 1 }}>
                  <ThemeSelector
                    onSelected={() => {
                      handleThemeMenuClose();
                      handleMenuClose();
                    }}
                  />
                </Box>
              </Menu>
              <Button
                className="text-xs"
                color="inherit"
                size="small"
                onClick={handleEditMenuClick}
              >
                Edit
              </Button>
              <Menu
                MenuListProps={{
                  "aria-labelledby": "edit-menu",
                }}
                anchorEl={editAnchorEl}
                id="edit-menu"
                open={editMenuOpen}
                onClose={handleMenuClose}
              >
                <MenuItem onClick={onCopyJsonToClipboard}>
                  Copy as JSON to clipboard
                </MenuItem>
              </Menu>
              {/* Display dynamic saved status */}
              <Box className="hidden sm:flex items-center gap-3 border-1 rounded-md px-2 text-xs text-muted">
                {isSaved
                  ? `Saved at ${savedTimestamp?.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) || "now"}`
                  : "Unsaved changes"}
              </Box>
            </div>
          </Box>
          <Box
            sx={{
              flex: "3 1 auto",
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Box className="hidden sm:flex items-center gap-3 border-1 rounded-md px-2 text-xs text-muted">
              ⚠️ Beta {process.env.NEXT_PUBLIC_VERSION_TAG || "v0.0.0"}
            </Box>
            {session ? (
              <>
                <IconButton
                  aria-label="Profile menu"
                  className="bg-toolBar-background text-toolBar-text"
                  size="small"
                  sx={{
                    backgroundColor: "var(--color-toolBar-background)",
                    color: "var(--color-toolBar-text)",
                    "&:hover": {
                      backgroundColor: "var(--color-toolBar-border)",
                    },
                  }}
                  onClick={handleProfileMenuClick}
                >
                  <PiUser />
                </IconButton>
                <Menu
                  MenuListProps={{
                    "aria-labelledby": "profile-menu",
                  }}
                  anchorEl={profileAchorEl}
                  id="profile-menu"
                  open={profileMenuOpen}
                  onClose={handleMenuClose}
                >
                  <MenuItem
                    onClick={() => {
                      signOut();
                    }}
                  >
                    Sign out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <Button
                className="bg-toolBar-background text-toolBar-text"
                size="small"
                sx={{
                  backgroundColor: "var(--color-toolBar-background)",
                  color: "var(--color-toolBar-text)",
                  "&:hover": {
                    backgroundColor: "var(--color-toolBar-border)",
                    color: "var(--color-toolBar-text)",
                  },
                }}
                variant="contained"
                onClick={() => {
                  signIn();
                }}
              >
                Sign in
              </Button>
            )}
          </Box>
        </MUIToolbar>
      </AppBar>
      <OpenProjectDialog
        open={openProjectDialogOpen}
        onClose={() => setOpenProjectDialogOpen(false)}
      />
      <ManageSharesDialog
        mindMapId={mindMapId}
        open={manageSharesDialogOpen}
        refreshToken={sharesRefreshToken}
        onClose={() => setManageSharesDialogOpen(false)}
      />
    </>
  );
};
