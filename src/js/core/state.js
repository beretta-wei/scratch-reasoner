import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  const preset = GRID_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) || GRID_PRESETS[0];
  const total = preset.cols * preset.rows;

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells: Array.from({ length: total }, (_, i) => ({
      index: i,       // 0-based
      value: null,
      revealed: false
    })),
    showIndex: false
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

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _emit() {
    for (const l of this.listeners) l();
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
    this._emit();
  }

  setPreset(presetId) {
    const preset = GRID_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const total = preset.cols * preset.rows;
    const cells = Array.from({ length: total }, (_, i) => ({
      index: i,
      value: null,
      revealed: false
    }));
    this.update({
      gridPresetId: preset.id,
      cols: preset.cols,
      rows: preset.rows,
      cells
    });
  }

  setCellValue(index, value) {
    const cells = this.state.cells.slice();
    if (index < 0 || index >= cells.length) return;

    let numeric = null;
    if (value !== null && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) numeric = num;
    }

    cells[index] = {
      ...cells[index],
      value: numeric,
      revealed: numeric !== null
    };

    this.update({ cells });
  }

  setShowIndex(flag) {
    this.update({ showIndex: !!flag });
  }

  reset() {
    this.update(createInitialState());
  }
}

export const store = new Store();
