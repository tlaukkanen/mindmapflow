import { logger } from "./logger";

export type ProjectSortOption = "name" | "lastModified";

export interface OpenProjectDialogPreferences {
  tagFilter: string[];
  sortOption: ProjectSortOption;
}

const DEFAULT_OPEN_PROJECT_PREFERENCES: OpenProjectDialogPreferences = {
  tagFilter: [],
  sortOption: "name",
};

const normalizeTagFilter = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const trimmed = item.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(trimmed);
  }

  return normalized;
};

class UserSettingsService {
  async getOpenProjectDialogSettings(): Promise<OpenProjectDialogPreferences> {
    try {
      const response = await fetch("/api/user-settings", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Failed to load user settings: ${response.status}`);
      }

      const data = (await response.json()) as {
        openProjectDialog?: {
          tagFilter?: unknown;
          sortOption?: unknown;
        };
      };

      const tagFilter = normalizeTagFilter(data.openProjectDialog?.tagFilter);

      const sortOption =
        data.openProjectDialog?.sortOption === "lastModified"
          ? "lastModified"
          : "name";

      return {
        tagFilter,
        sortOption,
      };
    } catch (error) {
      logger.error("Failed to load open project dialog settings", error);

      return DEFAULT_OPEN_PROJECT_PREFERENCES;
    }
  }

  async saveOpenProjectDialogSettings(
    preferences: OpenProjectDialogPreferences,
  ): Promise<void> {
    try {
      const normalizedTagFilter = normalizeTagFilter(preferences.tagFilter);
      const response = await fetch("/api/user-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
        body: JSON.stringify({
          openProjectDialog: {
            tagFilter: normalizedTagFilter,
            sortOption: preferences.sortOption,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save user settings: ${response.status}`);
      }
    } catch (error) {
      logger.error("Failed to save open project dialog settings", error);
      throw error;
    }
  }
}

export const userSettingsService = new UserSettingsService();
