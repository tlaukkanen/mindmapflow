"use client";

import {
  useRef,
  forwardRef,
  useImperativeHandle,
  KeyboardEvent,
  useState,
  useEffect,
} from "react";
import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import { Edge } from "@xyflow/react";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import {
  PiAlignBottomSimple,
  PiAlignCenterVerticalSimple,
  PiAlignTopSimple,
  PiArrowLeft,
  PiArrowRight,
  PiArrowsLeftRight,
  PiMinus,
  PiTextB,
  PiTextItalic,
  PiTextStrikethrough,
  PiTextUnderline,
} from "react-icons/pi";

import { TextProperties } from "./nodes/base-node";

import { MindMapNode } from "@/model/types";
import { getNamePrefixSuggestion } from "@/services/name-prefix-suggestions-service";

export interface PropertiesPanelHandle {
  focusNameInput: () => void;
  focusEdgeLabelInput: () => void;
  focusDescriptionInput: () => void;
}

interface PropertiesPanelProps {
  selectedNode: MindMapNode | undefined;
  selectedEdge: Edge | undefined;
  onNameChange: (newName: string) => void;
  onEdgeLabelChange: (newLabel: string) => void;
  onTextPropertiesChange: (props: Partial<TextProperties>) => void;
  onEdgeAnimatedChange: (animated: boolean) => void;
  onEdgeDirectionSwitch: () => void;
  onEdgeMarkerChange: (markerStart: boolean, markerEnd: boolean) => void;
  onImportOutline: (outline: string) => Promise<boolean> | boolean;
}

const PropertiesPanel = forwardRef<PropertiesPanelHandle, PropertiesPanelProps>(
  (
    {
      selectedNode,
      selectedEdge,
      onNameChange,
      onEdgeLabelChange,
      onTextPropertiesChange,
      onEdgeAnimatedChange,
      onEdgeDirectionSwitch,
      onEdgeMarkerChange,
      onImportOutline,
    },
    ref,
  ) => {
    PropertiesPanel.displayName = "PropertiesPanel";
    const inputRef = useRef<HTMLInputElement>(null);
    const edgeLabelRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLInputElement>(null);
    const [outlineInput, setOutlineInput] = useState("");
    const [isImporting, setIsImporting] = useState(false);

    useImperativeHandle(ref, () => ({
      focusNameInput: () => {
        inputRef.current?.focus();
      },
      focusEdgeLabelInput: () => {
        edgeLabelRef.current?.focus();
      },
      focusDescriptionInput: () => {
        descriptionRef.current?.focus();
      },
    }));

    // Maintain focus when selectedNode changes
    // useEffect(() => {
    //   if (selectedNode && inputRef.current) {
    //     inputRef.current.focus();
    //   }
    // }, [selectedNode?.id]);

    const handleVerticalAlignChange = (_: any, newAlign: string) => {
      onTextPropertiesChange({
        verticalAlign: newAlign as TextProperties["verticalAlign"],
      });
    };

    const handleTextFormatChange = (_: any, formats: string[]) => {
      onTextPropertiesChange({
        bold: formats.includes("bold"),
        italic: formats.includes("italic"),
        underline: formats.includes("underline"),
        strikethrough: formats.includes("strikethrough"),
      });
    };

    const handleMarkerStartChange = (_: any, newValue: string | null) => {
      const hasStart = newValue === "start-arrow";
      const hasEnd = selectedEdge?.markerEnd != null;

      onEdgeMarkerChange(hasStart, hasEnd);
    };

    const handleMarkerEndChange = (_: any, newValue: string | null) => {
      const hasStart = selectedEdge?.markerStart != null;
      const hasEnd = newValue === "target-arrow";

      onEdgeMarkerChange(hasStart, hasEnd);
    };

    useEffect(() => {
      if (!selectedNode || selectedNode.data.depth !== 0) {
        setOutlineInput("");
      }
    }, [selectedNode?.id, selectedNode?.data.depth]);

    const handleOutlineImport = async () => {
      const outline = outlineInput.trim();

      if (!outline) return;

      try {
        setIsImporting(true);
        const result = await Promise.resolve(onImportOutline(outline));

        if (result) {
          setOutlineInput("");
        }
      } finally {
        setIsImporting(false);
      }
    };

    return (
      <Box
        className="w-max-56 w-56 h-full border-solid border-0 border-l border-panels-border p-0 bg-panels-background flex flex-col text-panels-text"
        component="aside"
        sx={{
          "& .MuiTypography-root": {
            color: "var(--color-panels-text)",
          },
          "& .MuiButtonBase-root": {
            color: "var(--color-panels-text)",
          },
          "& .MuiButtonBase-root:hover": {
            color: "var(--color-link-text)",
          },
          "& .MuiInputBase-root": {
            color: "var(--color-panels-text)",
            backgroundColor: "var(--color-panels-background)",
          },
          "& .MuiInputBase-root fieldset": {
            borderColor: "var(--color-panels-border)",
          },
          "& .MuiInputBase-root:hover fieldset": {
            borderColor: "var(--color-link-text)",
          },
          "& .MuiInputBase-root.Mui-focused fieldset": {
            borderColor: "var(--color-link-text)",
          },
          "& .MuiSvgIcon-root": {
            color: "var(--color-panels-text)",
          },
        }}
      >
        <div className="overflow-y-auto flex-1">
          <div className="p-2 border-b border-panels-border space-y-2">
            <Typography variant="caption">
              {selectedNode
                ? selectedNode.data.resourceType
                : selectedEdge
                  ? "Connection properties"
                  : "Project properties"}
            </Typography>
            {selectedNode?.data.depth === 0 && (
              <>
                <Divider className="my-2" />
                <Typography variant="caption">
                  Import child topics under selected node
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  InputLabelProps={{
                    shrink: true,
                  }}
                  label="Child nodes outline"
                  margin="dense"
                  minRows={6}
                  placeholder="- Section
                    - Detail"
                  size="small"
                  value={outlineInput}
                  onChange={(e) => setOutlineInput(e.target.value)}
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key === "Enter" && event.ctrlKey) {
                      event.preventDefault();
                      void handleOutlineImport();
                    }
                  }}
                />
                <Button
                  className="mt-1"
                  color="inherit"
                  disabled={isImporting || !outlineInput.trim()}
                  size="small"
                  variant="outlined"
                  onClick={() => void handleOutlineImport()}
                >
                  {isImporting ? "Importing..." : "Import outline"}
                </Button>
              </>
            )}

            {selectedNode && selectedNode.type?.startsWith("azure") && (
              <TextField
                fullWidth
                disabled={!selectedNode}
                inputRef={inputRef}
                label="Resource Name"
                margin="dense"
                placeholder={getNamePrefixSuggestion(
                  selectedNode.data.resourceType,
                )}
                size="small"
                value={selectedNode?.data.resourceName || ""}
                onChange={(e) => onNameChange(e.target.value)}
                onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === "Tab" && !selectedNode.data.resourceName) {
                    e.preventDefault();
                    const suggestion = getNamePrefixSuggestion(
                      selectedNode.data.resourceType,
                    );
                    const prefix = suggestion.split("-")[0] + "-";

                    onNameChange(prefix);
                  }
                }}
              />
            )}

            {selectedEdge && (
              <TextField
                fullWidth
                multiline
                inputRef={edgeLabelRef}
                label="Edge Label"
                margin="dense"
                minRows={2}
                placeholder="Enter edge label"
                size="small"
                value={selectedEdge.label || ""}
                onChange={(e) => onEdgeLabelChange(e.target.value)}
              />
            )}

            <Divider className="my-2" />
            {selectedEdge && (
              <>
                <Typography variant="caption">Line markers</Typography>
                <FormGroup>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      width: "100%",
                    }}
                  >
                    <ToggleButtonGroup
                      exclusive
                      value={
                        selectedEdge?.markerStart ? "start-arrow" : "start-none"
                      }
                      onChange={handleMarkerStartChange}
                    >
                      <ToggleButton value="start-none">
                        <PiMinus />
                      </ToggleButton>
                      <ToggleButton value="start-arrow">
                        <PiArrowLeft />
                      </ToggleButton>
                    </ToggleButtonGroup>
                    <ToggleButtonGroup
                      exclusive
                      value={
                        selectedEdge?.markerEnd ? "target-arrow" : "target-none"
                      }
                      onChange={handleMarkerEndChange}
                    >
                      <ToggleButton value="target-arrow">
                        <PiArrowRight />
                      </ToggleButton>
                      <ToggleButton value="target-none">
                        <PiMinus />
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                  <Button
                    className="mt-2"
                    color="inherit"
                    endIcon={<PiArrowsLeftRight />}
                    size="small"
                    variant="outlined"
                    onClick={onEdgeDirectionSwitch}
                  >
                    Switch direction
                  </Button>
                </FormGroup>

                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedEdge?.animated || false}
                        onChange={(e) => onEdgeAnimatedChange(e.target.checked)}
                      />
                    }
                    label="Animated"
                  />
                  <FormControl fullWidth margin="dense" size="small">
                    <InputLabel>Line type</InputLabel>
                    <Select label="SKU" value={selectedEdge?.type || "bezier"}>
                      {["straight", "step", "smoothstep", "bezier"].map(
                        (lineType) => (
                          <MenuItem key={lineType} value={lineType}>
                            {lineType.charAt(0).toUpperCase() +
                              lineType.slice(1)}
                          </MenuItem>
                        ),
                      )}
                    </Select>
                  </FormControl>
                </FormGroup>
              </>
            )}
            {selectedNode && (
              <>
                <Typography variant="caption">Text properties</Typography>
                <FormGroup>
                  <ToggleButtonGroup
                    exclusive
                    value={
                      selectedNode?.data.textProperties?.verticalAlign || "top"
                    }
                    onChange={handleVerticalAlignChange}
                  >
                    <ToggleButton value="top">
                      <PiAlignTopSimple />
                    </ToggleButton>
                    <ToggleButton value="middle">
                      <PiAlignCenterVerticalSimple />
                    </ToggleButton>
                    <ToggleButton value="bottom">
                      <PiAlignBottomSimple />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Box className="h-2" />
                  <ToggleButtonGroup
                    value={[
                      selectedNode?.data.textProperties?.bold && "bold",
                      selectedNode?.data.textProperties?.italic && "italic",
                      selectedNode?.data.textProperties?.underline &&
                        "underline",
                      selectedNode?.data.textProperties?.strikethrough &&
                        "strikethrough",
                    ].filter(Boolean)}
                    onChange={handleTextFormatChange}
                  >
                    <ToggleButton value="bold">
                      <PiTextB />
                    </ToggleButton>
                    <ToggleButton value="italic">
                      <PiTextItalic />
                    </ToggleButton>
                    <ToggleButton value="underline">
                      <PiTextUnderline />
                    </ToggleButton>
                    <ToggleButton value="strikethrough">
                      <PiTextStrikethrough />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </FormGroup>
              </>
            )}
          </div>
        </div>
      </Box>
    );
  },
);

export default PropertiesPanel;
