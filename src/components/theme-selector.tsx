"use client";

import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

import { palettes, extractFirstHexColor } from "@/config/palettes";
import { useTheme } from "@/components/providers/ThemeProvider";

type ThemeSelectorProps = {
  onSelected?: () => void;
};

export function ThemeSelector({ onSelected }: ThemeSelectorProps) {
  const { palette, setPaletteId } = useTheme();
  const previewKeys = ["--bg", "--accent", "--accent-2", "--node-bg"] as const;

  return (
    <Stack spacing={1.5} sx={{ width: "100%", minWidth: 240 }}>
      <Typography
        fontWeight={600}
        sx={{ color: "var(--color-heading-text)" }}
        variant="subtitle2"
      >
        Color theme
      </Typography>
      <Stack component="ul" spacing={1} sx={{ p: 0, m: 0, listStyle: "none" }}>
        {palettes.map((item) => {
          const isSelected = item.id === palette.id;
          const backgroundValue = item.vars["--bg"];
          const fallbackColor =
            extractFirstHexColor(backgroundValue) ?? backgroundValue;

          return (
            <Box key={item.id} component="li">
              <ButtonBase
                sx={{
                  width: "100%",
                  justifyContent: "flex-start",
                  borderRadius: 1.5,
                  border: "1px solid",
                  borderColor: isSelected
                    ? "var(--color-primary)"
                    : "var(--color-divider)",
                  px: 1.5,
                  py: 1,
                  gap: 1.5,
                  color: "var(--color-body-text)",
                  backgroundColor: isSelected
                    ? "var(--color-panels-background)"
                    : "transparent",
                }}
                onClick={() => {
                  setPaletteId(item.id);
                  onSelected?.();
                }}
              >
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: "center", minWidth: 72 }}
                >
                  {previewKeys.map((key) => {
                    const value = item.vars[key];
                    const displayBackground =
                      key === "--bg" && value.includes("linear-gradient")
                        ? backgroundValue
                        : value;
                    const actualBackground =
                      key === "--bg" && value.includes("linear-gradient")
                        ? fallbackColor
                        : displayBackground;

                    return (
                      <Box
                        key={key}
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: 1,
                          border: "1px solid",
                          borderColor: "rgba(0,0,0,0.07)",
                          boxShadow: "inset 0 0 1px rgba(0,0,0,0.08)",
                          background:
                            key === "--bg" && value.includes("linear-gradient")
                              ? displayBackground
                              : actualBackground,
                          backgroundColor:
                            key === "--bg" && value.includes("linear-gradient")
                              ? undefined
                              : actualBackground,
                        }}
                      />
                    );
                  })}
                </Stack>
                <Stack
                  spacing={0.25}
                  sx={{ flex: 1, alignItems: "flex-start" }}
                >
                  <Typography fontWeight={600} variant="body2">
                    {item.name}
                  </Typography>
                  <Typography
                    sx={{ color: "var(--color-muted-text)" }}
                    variant="caption"
                  >
                    {item.description}
                  </Typography>
                </Stack>
                {isSelected ? (
                  <CheckCircleIcon
                    fontSize="small"
                    sx={{ color: "var(--color-primary)" }}
                  />
                ) : (
                  <RadioButtonUncheckedIcon
                    fontSize="small"
                    sx={{ color: "var(--color-muted-text)" }}
                  />
                )}
              </ButtonBase>
            </Box>
          );
        })}
      </Stack>
    </Stack>
  );
}
