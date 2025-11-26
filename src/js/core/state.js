import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  const preset = GRID_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) || GRID_PRESETS[0];
  const total = preset.cols * preset.rows;

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells: Array.from({ length: total }, (_, i) => ({
      index: i,
      value: null,
      revealed: false,
    })),
  };
}

class Store {
  constructor() {
    this.state = createInitialState();
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error("store listener error:", err);
      }
    }
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
    this._emit();
  }

  setGridPreset(presetId) {
    const preset = GRID_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const total = preset.cols * preset.rows;
    const cells = Array.from({ length: total }, (_, i) => ({
      index: i,
      value: null,
      revealed: false,
    }));
    this.update({
      gridPresetId: preset.id,
      cols: preset.cols,
      rows: preset.rows,
      cells,
    });
  }

  setCellValue(index, value) {
    const { cells } = this.state;
    if (!Array.isArray(cells) || index < 0 || index >= cells.length) return;

    const updated = cells.slice();
    updated[index] = {
      ...updated[index],
      value,
      revealed: value !== null && value !== undefined,
    };

    this.update({ cells: updated });
  }

  reset() {
    this.state = createInitialState();
    this._emit();
  }
}

export const store = new Store();
