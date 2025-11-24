import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  const preset = GRID_PRESETS.find(p => p.id === DEFAULT_PRESET_ID) || GRID_PRESETS[0];

  const totalCells = preset.cols * preset.rows;

  // 每格一個唯一 ID（1~totalCells），初始沒有值
  const cells = Array.from({ length: totalCells }, (_, index) => ({
    id: index + 1,         // 唯一整數
    index,                 // 0-based 位置
    row: Math.floor(index / preset.cols),
    col: index % preset.cols,
    value: null,           // 使用者輸入的號碼（1~120）
    revealed: false        // 是否已刮出
  }));

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells,
    // 之後可能加: history, stats, settings...
  };
}

class StateStore {
  #state;
  #listeners = new Set();

  constructor() {
    this.#state = createInitialState();
  }

  getState() {
    return this.#state;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #emit() {
    for (const listener of this.#listeners) {
      listener(this.#state);
    }
  }

  update(partial) {
    this.#state = { ...this.#state, ...partial };
    this.#emit();
  }

  /** 切換版型 */
  setGridPreset(presetId) {
    const preset = GRID_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    const totalCells = preset.cols * preset.rows;
    const cells = Array.from({ length: totalCells }, (_, index) => ({
      id: index + 1,
      index,
      row: Math.floor(index / preset.cols),
      col: index % preset.cols,
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

  /** 更新單一格子的值 */
  setCellValue(cellIndex, value) {
    const state = this.#state;
    if (cellIndex < 0 || cellIndex >= state.cells.length) return;

    const cellsCopy = state.cells.slice();
    cellsCopy[cellIndex] = {
      ...cellsCopy[cellIndex],
      value,
      revealed: value !== null
    };

    this.update({ cells: cellsCopy });
  }

  /** 全部重置 */
  reset() {
    this.#state = createInitialState();
    this.#emit();
  }
}

export const store = new StateStore();
