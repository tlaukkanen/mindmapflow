"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_PALETTE_ID,
  Palette,
  palettes,
  paletteToCssVariables,
  getPaletteById,
} from "@/config/palettes";

const STORAGE_KEY = "mindmapflow.palette";

type ThemeContextValue = {
  palette: Palette;
  setPaletteId: (id: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyPaletteToDocument(palette: Palette) {
  if (typeof document === "undefined") {
    return;
  }

  const vars = paletteToCssVariables(palette);
  const root = document.documentElement;

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });

  root.dataset.palette = palette.id;

  const body = document.body;

  body.dataset.palette = palette.id;
  body.style.background = vars["--page-background"];
  body.style.color = vars["--color-body-text"];
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [paletteId, setPaletteIdState] = useState<string>(DEFAULT_PALETTE_ID);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored && getPaletteById(stored)) {
      setPaletteIdState(stored);
    }
  }, []);

  const palette = useMemo(
    () =>
      getPaletteById(paletteId) ??
      getPaletteById(DEFAULT_PALETTE_ID) ??
      palettes[0],
    [paletteId],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    applyPaletteToDocument(palette);
    window.localStorage.setItem(STORAGE_KEY, palette.id);
  }, [palette]);

  const setPaletteId = useCallback((id: string) => {
    if (!getPaletteById(id)) {
      return;
    }
    setPaletteIdState(id);
  }, []);

  const value = useMemo(
    () => ({ palette, setPaletteId }),
    [palette, setPaletteId],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return ctx;
}
