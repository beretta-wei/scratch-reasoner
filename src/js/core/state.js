const LS_GRID_KEY='scratchReasoner.gridPreset';
import { GRID_PRESETS, DEFAULT_PRESET_ID } from "../config/gridPresets.js";

function createInitialState() {
  let savedPreset=(typeof localStorage!=='undefined')&&localStorage.getItem(LS_GRID_KEY);
  let preset=null;
  if(savedPreset){ preset=GRID_PRESETS.find(p=>p.id===savedPreset); }
  if(!preset){
  const preset = GRID_PRESETS.find(p => p.id === DEFAULT_PRESET_ID) || GRID_PRESETS[0];
  const total = preset.cols * preset.rows;

  return {
    gridPresetId: preset.id,
    cols: preset.cols,
    rows: preset.rows,
    cells: Array.from({ length: total }, (_, i) => ({
      index: i,
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

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  _emit() {
    for (const fn of this.listeners) {
      try {
        fn();
      } catch (err) {
        console.error("store listener error", err);
      }
    }
  }

  update(patch) {
    this.state = { ...this.state, ...patch };
    this._emit();
  }

  setGridPreset(presetId) {
    let savedPreset=(typeof localStorage!=='undefined')&&localStorage.getItem(LS_GRID_KEY);
  let preset=null;
  if(savedPreset){ preset=GRID_PRESETS.find(p=>p.id===savedPreset); }
  if(!preset){
  const preset = GRID_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const total = preset.cols * preset.rows;
    const cells = Array.from({ length: total }, (_, i) => ({
      index: i,
      value: null,
      revealed: false
    }));
    if(typeof localStorage!=='undefined'){localStorage.setItem(LS_GRID_KEY,preset.id);} 
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
    if (value !== null && value !== undefined && value !== "") {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        numeric = num;
      }
    }

    cells[index] = {
      ...cells[index],
      value: numeric,
      revealed: numeric !== null
    };

    if(typeof localStorage!=='undefined'){localStorage.setItem(LS_GRID_KEY,preset.id);} 
    this.update({ cells });
  }

  setShowIndex(flag) {
    if(typeof localStorage!=='undefined'){localStorage.setItem(LS_GRID_KEY,preset.id);} 
    this.update({ showIndex: !!flag });
  }

  reset() {
    this.state = createInitialState();
    this._emit();
  }
}

export const store = new Store();
