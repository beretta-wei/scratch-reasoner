import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  const preset = GRID_PRESETS.find((p) => p.id === DEFAULT_PRESET_ID) || GRID_PRESETS[0];
  const total = preset.cols * preset.rows;

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells: Array.from({ length: total }, (_, i) => ({
      index: i,       // 0-based internal index
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

  update(partial) {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener();
    }
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
    const { cells } = this.state;
    if (index < 0 || index >= cells.length) return;

    const updated = cells.slice();
    const numeric =
      value === null || value === "" ? null : Number.isNaN(Number(value)) ? null : Number(value);

    updated[index] = {
      ...updated[index],
      value: numeric,
      revealed: numeric !== null
    };

    this.update({ cells: updated });
  }

  setShowIndex(flag) {
    this.update({ showIndex: !!flag });
  }

  reset() {
    this.update(createInitialState());
  }
}

export const store = new Store();
