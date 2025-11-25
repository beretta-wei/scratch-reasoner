import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  const preset = GRID_PRESETS.find(p => p.id === DEFAULT_PRESET_ID);
  const total = preset.cols * preset.rows;

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells: Array.from({ length: total }, (_, i) => ({
      index: i,
      value: null,
      revealed: false
    }))
  };
}

class Store {
  #state = createInitialState();
  #listeners = new Set();

  subscribe(fn) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  getState() {
    return this.#state;
  }

  update(patch) {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach(fn => fn(this.#state));
  }

  setGridPreset(id) {
    const preset = GRID_PRESETS.find(p => p.id === id);
    if (!preset) return;

    const total = preset.cols * preset.rows;
    this.update({
      gridPresetId: id,
      cols: preset.cols,
      rows: preset.rows,
      cells: Array.from({ length: total }, (_, i) => ({
        index: i,
        value: null,
        revealed: false
      }))
    });
  }

  setCellValue(index, value) {
    const updated = [...this.#state.cells];
    updated[index] = {
      ...updated[index],
      value,
      revealed: value !== null
    };
    this.update({ cells: updated });
  }

  reset() {
    this.update(createInitialState());
  }
}

export const store = new Store();
