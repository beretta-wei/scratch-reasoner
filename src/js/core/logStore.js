import { store } from "./state.js";
import { GRID_PRESETS } from "../config/gridPresets.js";

const STORAGE_LOGS_KEY = "scratchReasonerLogs";
const STORAGE_LABELS_KEY = "scratchReasonerLogLabels";

// 預設名稱（由使用者提供）
const DEFAULT_LABELS = [
  "阿傑",
  "老師",
  "肥昌",
  "俊宏",
  "宏銘",
  "鐵馬",
  "鐵路222",
  "益民227",
  "益民123",
];

let logs = [];
let labels = [...DEFAULT_LABELS];
let activeLogId = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch (err) {
      console.error("logStore listener error:", err);
    }
  }
}

function loadFromStorage() {
  try {
    const logsRaw = window.localStorage.getItem(STORAGE_LOGS_KEY);
    const labelsRaw = window.localStorage.getItem(STORAGE_LABELS_KEY);

    if (logsRaw) {
      const parsed = JSON.parse(logsRaw);
      if (Array.isArray(parsed)) {
        logs = parsed;
      }
    }

    if (labelsRaw) {
      const parsedLabels = JSON.parse(labelsRaw);
      if (Array.isArray(parsedLabels)) {
        // 合併預設與使用者已儲存名稱
        const set = new Set(DEFAULT_LABELS);
        parsedLabels.forEach((name) => {
          if (typeof name === "string" && name.trim()) {
            set.add(name.trim());
          }
        });
        labels = Array.from(set);
      }
    }
  } catch (err) {
    console.error("loadFromStorage error:", err);
  }
}

function saveToStorage() {
  try {
    window.localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
    window.localStorage.setItem(STORAGE_LABELS_KEY, JSON.stringify(labels));
  } catch (err) {
    console.error("saveToStorage error:", err);
  }
}

function formatTimestamp(date) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${y}${m}${d}-${hh}${mm}${ss}`;
}

export function initLogStore() {
  if (typeof window === "undefined") return;

  loadFromStorage();

  // 監聽 grid 狀態變化，若有作用中的 log，則一併更新其 cells
  store.subscribe(() => {
    if (!activeLogId) return;
    const state = store.getState();
    const log = logs.find((l) => l.id === activeLogId);
    if (!log) return;

    log.gridPresetId = state.gridPresetId;
    log.cols = state.cols;
    log.rows = state.rows;
    log.cells = state.cells.map((c) => ({
      index: c.index,
      value: c.value,
    }));

    saveToStorage();
    emit();
  });
}

export function subscribeLog(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getLogState() {
  return {
    logs,
    labels,
    activeLogId,
  };
}

export function addLabelName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  if (!labels.includes(trimmed)) {
    labels.push(trimmed);
    saveToStorage();
    emit();
  }
}

export function createLogForCurrentState(labelName) {
  const trimmed = (labelName || "").trim();
  if (!trimmed) return null;

  const state = store.getState();
  const total = state.cols * state.rows;
  const id = `${trimmed}_${total}_${formatTimestamp(new Date())}`;

  const log = {
    id,
    labelName: trimmed,
    gridPresetId: state.gridPresetId,
    cols: state.cols,
    rows: state.rows,
    createdAt: Date.now(),
    cells: state.cells.map((c) => ({
      index: c.index,
      value: c.value,
    })),
  };

  logs.push(log);
  activeLogId = id;
  saveToStorage();
  emit();

  return log;
}

export function setActiveLog(id) {
  const log = logs.find((l) => l.id === id);
  if (!log) return;

  activeLogId = id;

  // 確保使用對應模板
  const preset = GRID_PRESETS.find((p) => p.id === log.gridPresetId);
  if (preset) {
    store.setGridPreset(preset.id);
  }

  // 套用格子內容
  const totalCells = log.cols * log.rows;
  for (let i = 0; i < totalCells; i++) {
    const cellData = log.cells.find((c) => c.index === i);
    const value = cellData ? cellData.value : null;
    store.setCellValue(i, value);
  }

  emit();
}

export function clearActiveLog() {
  activeLogId = null;
  emit();
}
