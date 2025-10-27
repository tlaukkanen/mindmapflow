"use client";

import { createContext, useContext, useState } from "react";

type EditorContextType = {
  isFullScreen: boolean;
  setIsFullScreen: (value: boolean) => void;
  editorVersion: number;
  setEditorVersion: (value: number) => void;
  isGlobalSearchActive: boolean;
  setIsGlobalSearchActive: (value: boolean) => void;
};

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [editorVersion, setEditorVersion] = useState<number>(0);
  const [isGlobalSearchActive, setIsGlobalSearchActive] =
    useState<boolean>(false);

  return (
    <EditorContext.Provider
      value={{
        isFullScreen,
        setIsFullScreen,
        editorVersion,
        setEditorVersion,
        isGlobalSearchActive,
        setIsGlobalSearchActive,
      }}
    >
      {children}
    </EditorContext.Provider>
  );
}

export function useEditor() {
  const context = useContext(EditorContext);

  if (!context) throw new Error("useEditor must be used within EditorProvider");

  return context;
}
