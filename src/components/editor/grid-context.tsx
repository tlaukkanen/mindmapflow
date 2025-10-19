import { createContext, ReactNode, useContext } from "react";

interface GridSettingsContextValue {
  enabled: boolean;
  step: number;
}

const DEFAULT_STEP = 10;

const GridSettingsContext = createContext<GridSettingsContextValue>({
  enabled: false,
  step: DEFAULT_STEP,
});

interface GridSettingsProviderProps {
  children: ReactNode;
  enabled: boolean;
  step?: number;
}

export function GridSettingsProvider({
  children,
  enabled,
  step = DEFAULT_STEP,
}: GridSettingsProviderProps) {
  return (
    <GridSettingsContext.Provider value={{ enabled, step }}>
      {children}
    </GridSettingsContext.Provider>
  );
}

export function useGridSettings() {
  return useContext(GridSettingsContext);
}
