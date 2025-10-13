export type PaletteVariableKey =
  | "--bg"
  | "--header"
  | "--accent"
  | "--accent-2"
  | "--node-bg"
  | "--text"
  | "--muted"
  | "--note-bg";

export type Palette = {
  id: string;
  name: string;
  description: string;
  vars: Record<PaletteVariableKey, string>;
};

export const palettes: Palette[] = [
  {
    id: "tech",
    name: "Tech Calm",
    description: "Modern, clean & professional.",
    vars: {
      "--bg": "#F5F7FA",
      "--header": "#2f2f37",
      "--accent": "#4C6EF5",
      "--accent-2": "#ADB5BD",
      "--node-bg": "#FFFFFF",
      "--text": "#212529",
      "--muted": "#6b6b76",
      "--note-bg": "#FFF8C2",
    },
  },
  {
    id: "natural",
    name: "Natural Flow",
    description: "Organic, calming, nature-inspired.",
    vars: {
      "--bg": "#F0EAD6",
      "--header": "#2B2F2B",
      "--accent": "#4E9F3D",
      "--accent-2": "#D8CCA3",
      "--node-bg": "#FFFFFF",
      "--text": "#2B2B2B",
      "--muted": "#556655",
      "--note-bg": "#FFF4D1",
    },
  },
  {
    id: "neo",
    name: "Neo Purple",
    description: "Creative, elegant purple tones.",
    vars: {
      "--bg": "#F8F5FF",
      "--header": "#2E1F47",
      "--accent": "#6A4C93",
      "--accent-2": "#B497E7",
      "--node-bg": "#FFFFFF",
      "--text": "#2E1F47",
      "--muted": "#6f6484",
      "--note-bg": "#FFF3FF",
    },
  },
  {
    id: "gradient",
    name: "Soft Gradient Flow",
    description: "Light gradient, modern and uplifting.",
    vars: {
      "--bg": "linear-gradient(180deg,#E0EAFC 0%, #CFDEF3 100%)",
      "--header": "#1F2937",
      "--accent": "#0072F5",
      "--accent-2": "#7F5AF0",
      "--node-bg": "#FFFFFF",
      "--text": "#1F2937",
      "--muted": "#5a6472",
      "--note-bg": "#FEFFEA",
    },
  },
  {
    id: "warm",
    name: "Warm Minimal",
    description: "Cozy, friendly and approachable.",
    vars: {
      "--bg": "#FFF9F3",
      "--header": "#3A3A3A",
      "--accent": "#F4A261",
      "--accent-2": "#2A9D8F",
      "--node-bg": "#FFFFFF",
      "--text": "#3A3A3A",
      "--muted": "#666666",
      "--note-bg": "#FFF1D6",
    },
  },
];

export const DEFAULT_PALETTE_ID = palettes[0].id;

export function getPaletteById(id: string): Palette | undefined {
  return palettes.find((palette) => palette.id === id);
}

export function extractFirstHexColor(value: string): string | undefined {
  const match = value.match(/#(?:[0-9a-fA-F]{3}){1,2}/);

  return match?.[0];
}

export type PaletteCssVariableMap = Record<string, string>;

export function paletteToCssVariables(palette: Palette): PaletteCssVariableMap {
  const solidBackground = palette.vars["--bg"].includes("linear-gradient")
    ? (extractFirstHexColor(palette.vars["--bg"]) ?? "#FFFFFF")
    : palette.vars["--bg"];

  const vars: PaletteCssVariableMap = {
    "--palette-id": palette.id,
    "--palette-bg": palette.vars["--bg"],
    "--palette-bg-solid": solidBackground,
    "--palette-header": palette.vars["--header"],
    "--palette-accent": palette.vars["--accent"],
    "--palette-accent-2": palette.vars["--accent-2"],
    "--palette-node-bg": palette.vars["--node-bg"],
    "--palette-text": palette.vars["--text"],
    "--palette-muted": palette.vars["--muted"],
    "--palette-note-bg": palette.vars["--note-bg"],

    // Shared semantic tokens used across the UI
    "--page-background": palette.vars["--bg"],
    "--color-body-text": palette.vars["--text"],
    "--color-heading-text": palette.vars["--header"],
    "--color-muted-text": palette.vars["--muted"],
    "--color-link-text": palette.vars["--accent"],
    "--color-link-text-hover": palette.vars["--accent-2"],

    // Editor specific tokens mapped from legacy Tailwind color names
    "--color-panels-background": palette.vars["--node-bg"],
    "--color-panels-border": palette.vars["--muted"],
    "--color-panels-text": palette.vars["--text"],

    "--color-menuBar-background": palette.vars["--header"],
    "--color-menuBar-border": palette.vars["--header"],
    "--color-menuBar-text": palette.vars["--node-bg"],

    "--color-toolBar-background": palette.vars["--accent-2"],
    "--color-toolBar-border": palette.vars["--accent"],
    "--color-toolBar-text": palette.vars["--node-bg"],

    "--color-canvas-background": palette.vars["--bg"],
    "--color-canvas-background-backup": solidBackground,
    "--color-canvas-node-background": palette.vars["--node-bg"],
    "--color-canvas-node-border": palette.vars["--muted"],
    "--color-canvas-node-text": palette.vars["--text"],

    "--color-collectionNodes-background100": palette.vars["--node-bg"],
    "--color-collectionNodes-background200": solidBackground,
    "--color-collectionNodes-background300": palette.vars["--accent-2"],
    "--color-collectionNodes-text": palette.vars["--text"],

    "--color-divider": palette.vars["--muted"],
    "--color-background": palette.vars["--accent"],
    "--color-foreground": palette.vars["--header"],
    "--color-primary": palette.vars["--accent"],
    "--color-primary-foreground": palette.vars["--node-bg"],
    "--color-note-background": palette.vars["--note-bg"],
  };

  return vars;
}
