"use client";

import { useRef, forwardRef, useImperativeHandle, KeyboardEvent } from "react";
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
  PiTextAlignCenter,
  PiTextAlignJustify,
  PiTextAlignLeft,
  PiTextAlignRight,
  PiTextB,
  PiTextItalic,
  PiTextStrikethrough,
  PiTextUnderline,
} from "react-icons/pi";

import { TextProperties } from "./nodes/base-node";

import { DiagramElement } from "@/model/types";
import { ResourceNodeTypes } from "@/model/node-types";
import { getNamePrefixSuggestion } from "@/services/name-prefix-suggestions-service";

export interface PropertiesPanelHandle {
  focusNameInput: () => void;
  focusEdgeLabelInput: () => void;
  focusDescriptionInput: () => void;
}

interface PropertiesPanelProps {
  selectedNode: DiagramElement | undefined;
  selectedEdge: Edge | undefined;
  onNameChange: (newName: string) => void;
  onSkuChange: (newSku: string) => void;
  onEdgeLabelChange: (newLabel: string) => void;
  onDescriptionChange: (newDescription: string) => void;
  onTextPropertiesChange: (props: Partial<TextProperties>) => void;
  onEdgeAnimatedChange: (animated: boolean) => void;
  onEdgeDirectionSwitch: () => void;
  onResourceOptionChange: (
    optionName: string,
    value: string,
    show?: boolean,
  ) => void;
  onEdgeMarkerChange: (markerStart: boolean, markerEnd: boolean) => void;
}

const PropertiesPanel = forwardRef<PropertiesPanelHandle, PropertiesPanelProps>(
  (
    {
      selectedNode,
      selectedEdge,
      onNameChange,
      onSkuChange,
      onEdgeLabelChange,
      onDescriptionChange,
      onTextPropertiesChange,
      onEdgeAnimatedChange,
      onEdgeDirectionSwitch,
      onResourceOptionChange,
      onEdgeMarkerChange,
    },
    ref,
  ) => {
    PropertiesPanel.displayName = "PropertiesPanel";
    const inputRef = useRef<HTMLInputElement>(null);
    const edgeLabelRef = useRef<HTMLInputElement>(null);
    const descriptionRef = useRef<HTMLInputElement>(null);

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

    // Find SKU options for the selected resource
    const getSkuOptions = () => {
      if (!selectedNode) return [];

      const resourceName = selectedNode.data.resourceType;
      const resource = ResourceNodeTypes.find((r) => r.name === resourceName);

      if (resource?.sku) {
        return resource.sku;
      }

      return [];
    };

    const skuOptions = getSkuOptions();

    // Add this helper function after getSkuOptions
    const getOtherOptions = () => {
      if (!selectedNode) return [];
      const resourceName = selectedNode.data.resourceType;
      const resource = ResourceNodeTypes.find((r) => r.name === resourceName);

      if (resource?.otherOptions) {
        return resource.otherOptions;
      }

      return [];
    };

    const otherOptions = getOtherOptions();

    // Maintain focus when selectedNode changes
    // useEffect(() => {
    //   if (selectedNode && inputRef.current) {
    //     inputRef.current.focus();
    //   }
    // }, [selectedNode?.id]);

    const handleTextAlignChange = (_: any, newAlign: string) => {
      onTextPropertiesChange({
        textAlign: newAlign as TextProperties["textAlign"],
      });
    };

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

    return (
      <div className="w-max-56 w-56 h-full border-solid border-0 border-l border-gray-200 p-0 bg-panels-background flex flex-col">
        <div className="overflow-y-auto flex-1">
          <div className="p-2 border-b border-gray-200 space-y-2">
            <Typography className="text-gray-500" variant="caption">
              {selectedNode
                ? selectedNode.data.resourceType
                : selectedEdge
                  ? "Connection properties"
                  : "Project properties"}
            </Typography>

            {selectedNode && selectedNode.type?.startsWith("azure") && (
              <TextField
                fullWidth
                className="bg-white"
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
                className="bg-white"
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

            {skuOptions.length > 0 && selectedNode && (
              <FormControl fullWidth margin="dense" size="small">
                <InputLabel>SKU</InputLabel>
                <Select
                  className="bg-white"
                  disabled={!selectedNode}
                  label="SKU"
                  value={selectedNode?.data.sku || ""}
                  onChange={(e) => onSkuChange(e.target.value)}
                >
                  {skuOptions.map((sku) => (
                    <MenuItem key={sku} value={sku}>
                      {sku}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            {selectedNode && (
              <TextField
                fullWidth
                multiline
                className="p-0 m-0 bg-white"
                inputRef={descriptionRef}
                label="Description"
                margin="dense"
                minRows={2}
                placeholder="Enter resource description"
                size="small"
                value={selectedNode?.data.description || ""}
                onChange={(e) => onDescriptionChange(e.target.value)}
              />
            )}

            {otherOptions.length > 0 && selectedNode && (
              <>
                <Divider className="my-2" />
                <Typography
                  className="text-gray-500 flex justify-between items-center"
                  variant="caption"
                >
                  <span>Additional options</span>
                  <span>Show</span>
                </Typography>
                {otherOptions.map((option) => {
                  const resourceOption =
                    selectedNode.data.resourceOptions?.find(
                      (opt) => opt.name === option.name,
                    );
                  const currentValue = resourceOption?.value || "";
                  const isShown = resourceOption?.show || false;

                  return (
                    <FormControl
                      key={option.name}
                      fullWidth
                      margin="dense"
                      size="small"
                    >
                      <InputLabel>{option.name}</InputLabel>
                      <Box
                        sx={{ display: "flex", gap: 1, alignItems: "center" }}
                      >
                        <Select
                          className="bg-white"
                          label={option.name}
                          sx={{ flex: 1 }}
                          value={currentValue}
                          onChange={(e) =>
                            onResourceOptionChange(option.name, e.target.value)
                          }
                        >
                          {option.options.map((value) => (
                            <MenuItem key={value} value={value}>
                              {value}
                            </MenuItem>
                          ))}
                        </Select>
                        <Checkbox
                          checked={isShown}
                          size="small"
                          sx={{ padding: "1px", margin: 0 }}
                          title="Show on diagram"
                          onChange={(e) =>
                            onResourceOptionChange(
                              option.name,
                              currentValue,
                              e.target.checked,
                            )
                          }
                        />
                      </Box>
                    </FormControl>
                  );
                })}
              </>
            )}

            <Divider className="my-2" />
            {selectedEdge && (
              <>
                <Typography className="text-gray-500" variant="caption">
                  Line markers
                </Typography>
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
                    <Select
                      className="bg-white"
                      label="SKU"
                      value={selectedEdge?.type || "bezier"}
                    >
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
                <Typography className="text-gray-500" variant="caption">
                  Text properties
                </Typography>
                <FormGroup>
                  <ToggleButtonGroup
                    exclusive
                    value={
                      selectedNode?.data.textProperties?.textAlign || "left"
                    }
                    onChange={handleTextAlignChange}
                  >
                    <ToggleButton value="left">
                      <PiTextAlignLeft />
                    </ToggleButton>
                    <ToggleButton value="center">
                      <PiTextAlignCenter />
                    </ToggleButton>
                    <ToggleButton value="right">
                      <PiTextAlignRight />
                    </ToggleButton>
                    <ToggleButton value="justify">
                      <PiTextAlignJustify />
                    </ToggleButton>
                  </ToggleButtonGroup>
                  <Box className="h-2" />
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
      </div>
    );
  },
);

export default PropertiesPanel;
