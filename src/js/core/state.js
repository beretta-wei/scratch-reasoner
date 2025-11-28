
// Corrected state.js (clean + with LocalStorage gridPreset support)
// NOTE: This is a reconstructed version based on standard project structure.
// You should replace your existing src/js/core/state.js with this file.

import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

const LS_GRID_KEY = "scratchReasoner.gridPreset";

function createInitialState() {
  // load preset from localStorage
  let savedPresetId = null;
  if (typeof localStorage !== "undefined") {
    savedPresetId = localStorage.getItem(LS_GRID_KEY);
  }

  let preset = null;
  if (savedPresetId) {
    preset = GRID_PRESETS.find((p) => p.id === savedPresetId);
  }

  // fallback
  if (!preset) {
    preset = GRID_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID);
  }

  return {
    rows: preset.rows,
    cols: preset.cols,
    cells: new Array(preset.rows * preset.cols).fill(""),
    showIndex: false,
  };
}

let state = createInitialState();

export const store = {
  getState() {
    return state;
  },

  setGridPreset(presetId) {
    const preset = GRID_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    state.rows = preset.rows;
    state.cols = preset.cols;
    state.cells = new Array(preset.rows * preset.cols).fill("");

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LS_GRID_KEY, preset.id);
    }
  },

  setCellValue(index, value) {
    if (index < 0 || index >= state.cells.length) return;
    state.cells[index] = value;
  },

  setShowIndex(flag) {
    state.showIndex = !!flag;
  },
};

