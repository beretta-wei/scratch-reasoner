import { store } from "./state.js";

const LS_NAMES_KEY = "scratchReasoner.logNames";
const LS_LOGS_KEY = "scratchReasoner.logs";
const LS_ACTIVE_KEY = "scratchReasoner.activeLogId";
const LS_CURRENT_LABEL_KEY = "scratchReasoner.currentLabelName";

const DEFAULT_LABELS = [
  "阿傑",
  "老師",
  "肥昌",
  "俊宏",
  "宏銘",
  "鐵馬",
  "鐵路222",
  "益民227",
  "益民123"
];

let logState = {
  labelNames: [...DEFAULT_LABELS],
  logs: [],
  activeLogId: null,
  currentLabelName: DEFAULT_LABELS[0] || ""
};

function safeParse(json, fallback) {
  if (!json) return fallback;
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(fallback) && typeof fallback === "object" && fallback !== null) {
      return typeof v === "object" && v !== null ? v : fallback;
    }
    return Array.isArray(fallback) ? (Array.isArray(v) ? v : fallback) : fallback;
  } catch {
    return fallback;
  }
}

function loadFromStorage() {
  if (typeof localStorage === "undefined") return;
  logState.labelNames = safeParse(localStorage.getItem(LS_NAMES_KEY), logState.labelNames);
  logState.logs = safeParse(localStorage.getItem(LS_LOGS_KEY), []);
  const active = localStorage.getItem(LS_ACTIVE_KEY);
  logState.activeLogId = active || null;
  const savedLabel = localStorage.getItem(LS_CURRENT_LABEL_KEY);
  if (savedLabel) {
    logState.currentLabelName = savedLabel;
  }
}

function saveNames() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_NAMES_KEY, JSON.stringify(logState.labelNames));
}

function saveLogsAndActive() {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LS_LOGS_KEY, JSON.stringify(logState.logs));
  if (logState.activeLogId) {
    localStorage.setItem(LS_ACTIVE_KEY, logState.activeLogId);
  } else {
    localStorage.removeItem(LS_ACTIVE_KEY);
  }
}

function snapshotStateToActiveLog() {
  if (!logState.activeLogId) return;
  const idx = logState.logs.findIndex(l => l.id === logState.activeLogId);
  if (idx === -1) return;

  const s = store.getState();
  const log = logState.logs[idx];

  if (log.cols !== s.cols || log.rows !== s.rows) {
    return;
  }

  log.gridPresetId = s.gridPresetId;
  log.cells = s.cells.map(c => ({
    index: c.index,
    value: c.value,
    revealed: c.revealed
  }));

  saveLogsAndActive();
}

export function initLogStore() {
  loadFromStorage();

  // 若 storage 中沒有有效名稱，至少要有預設一個
  if (!logState.labelNames || logState.labelNames.length === 0) {
    logState.labelNames = [...DEFAULT_LABELS];
  }
  if (!logState.currentLabelName && logState.labelNames.length > 0) {
    logState.currentLabelName = logState.labelNames[0];
  }

  // 監聽 grid 狀態變化，自動同步到目前 Log
  store.subscribe(() => {
    snapshotStateToActiveLog();
  });
}

export function getLogState() {
  const { labelNames, logs, activeLogId, currentLabelName } = logState;
  return {
    labelNames: [...labelNames],
    logs: [...logs],
    activeLogId,
    currentLabelName
  };
}

export function setCurrentLabelName(name) {
  logState.currentLabelName = name;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LS_CURRENT_LABEL_KEY, name);
  }
}

export function addLabelName(name) {
  const trimmed = (name || "").trim();
  if (!trimmed) return;
  if (!logState.labelNames.includes(trimmed)) {
    logState.labelNames.push(trimmed);
    saveNames();
  }
  logState.currentLabelName = trimmed;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(LS_CURRENT_LABEL_KEY, trimmed);
  }
}

function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}${MM}${dd}-${hh}${mm}${ss}`;
}

export function createLogForCurrentState() {
  const label = (logState.currentLabelName || "").trim();
  if (!label) return null;

  const s = store.getState();
  const total = s.cols * s.rows;
  const now = new Date();
  const ts = formatTimestamp(now);
  const id = `${label}_${total}_${ts}`;

  const log = {
    id,
    labelName: label,
    gridPresetId: s.gridPresetId,
    cols: s.cols,
    rows: s.rows,
    createdAt: now.toISOString(),
    cells: s.cells.map(c => ({
      index: c.index,
      value: c.value,
      revealed: c.revealed
    })),
    luckyNumbers: {
      major: [],
      minor: []
    }
  };

  logState.logs.push(log);
  logState.activeLogId = id;
  saveLogsAndActive();
  return log;
}

export function setActiveLog(logId) {
  logState.activeLogId = logId || null;
  if (!logId) {
    saveLogsAndActive();
    return;
  }

  const log = logState.logs.find(l => l.id === logId);
  if (!log) {
    saveLogsAndActive();
    return;
  }

  const cells = log.cells || [];
  const total = log.cols * log.rows;
  const normalizedCells = Array.from({ length: total }, (_, i) => {
    const found = cells.find(c => c.index === i);
    const val = found ? found.value : null;
    return {
      index: i,
      value: val,
      revealed: val !== null && val !== undefined && val !== ""
    };
  });

  store.update({
    gridPresetId: log.gridPresetId,
    cols: log.cols,
    rows: log.rows,
    cells: normalizedCells
  });

  saveLogsAndActive();
}

export function clearActiveLog() {
  logState.activeLogId = null;
  saveLogsAndActive();
}

export function getLogsForCurrentView() {
  const s = store.getState();
  const total = s.cols * s.rows;
  const label = logState.currentLabelName;
  return logState.logs
    .filter(l => l.labelName === label && l.cols * l.rows === total)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}


export function getLuckyNumbersForActiveLog() {
  if (!logState.activeLogId) {
    return { major: [], minor: [] };
  }
  const idx = logState.logs.findIndex(l => l.id === logState.activeLogId);
  if (idx === -1) {
    return { major: [], minor: [] };
  }
  const log = logState.logs[idx];
  const s = store.getState();
  const total = s.cols * s.rows;

  if (!log.luckyNumbers) {
    log.luckyNumbers = { major: [], minor: [] };
  }

  const major = Array.isArray(log.luckyNumbers.major)
    ? log.luckyNumbers.major.filter(n => Number.isInteger(n) && n >= 1 && n <= total)
    : [];
  const minor = Array.isArray(log.luckyNumbers.minor)
    ? log.luckyNumbers.minor.filter(n => Number.isInteger(n) && n >= 1 && n <= total)
    : [];

  log.luckyNumbers.major = [...new Set(major)].sort((a, b) => a - b);
  log.luckyNumbers.minor = [...new Set(minor)].sort((a, b) => a - b);
  saveLogsAndActive();

  return {
    major: [...log.luckyNumbers.major],
    minor: [...log.luckyNumbers.minor]
  };
}

export function setLuckyNumbersForActiveLog(type, numbers) {
  if (!logState.activeLogId) return;
  const idx = logState.logs.findIndex(l => l.id === logState.activeLogId);
  if (idx === -1) return;

  const log = logState.logs[idx];
  if (!log.luckyNumbers) {
    log.luckyNumbers = { major: [], minor: [] };
  }

  const s = store.getState();
  const total = s.cols * s.rows;

  const normalized = Array.from(
    new Set(
      (numbers || [])
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= total)
    )
  ).sort((a, b) => a - b);

  if (type === "major") {
    log.luckyNumbers.major = normalized;
  } else if (type === "minor") {
    log.luckyNumbers.minor = normalized;
  }

  saveLogsAndActive();
}


export function buildExportPayloadForActiveLog() {
  if (!logState.activeLogId) return null;
  const idx = logState.logs.findIndex(l => l.id === logState.activeLogId);
  if (idx === -1) return null;
  const log = logState.logs[idx];

  return {
    version: "1.0",
    id: log.id,
    labelName: log.labelName,
    createdAt: log.createdAt,
    cols: log.cols,
    rows: log.rows,
    cells: (log.cells || []).map(c => ({
      index: c.index,
      value: c.value,
      revealed: c.revealed
    })),
    luckyNumbers: {
      major: (log.luckyNumbers && Array.isArray(log.luckyNumbers.major)) ? [...log.luckyNumbers.major] : [],
      minor: (log.luckyNumbers && Array.isArray(log.luckyNumbers.minor)) ? [...log.luckyNumbers.minor] : []
    }
  };
}

export function buildExportPayloadForAllLogs() {
  const logs = (logState.logs || []).map(log => ({
    id: log.id,
    labelName: log.labelName,
    createdAt: log.createdAt,
    cols: log.cols,
    rows: log.rows,
    cells: (log.cells || []).map(c => ({
      index: c.index,
      value: c.value,
      revealed: c.revealed
    })),
    luckyNumbers: {
      major: (log.luckyNumbers && Array.isArray(log.luckyNumbers.major)) ? [...log.luckyNumbers.major] : [],
      minor: (log.luckyNumbers && Array.isArray(log.luckyNumbers.minor)) ? [...log.luckyNumbers.minor] : []
    }
  }));

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    logs
  };
}

export function clearAllLogsFromStorage() {
  logState.labelNames = [];
  logState.logs = [];
  logState.activeLogId = null;
  localStorage.removeItem(LS_NAMES_KEY);
  localStorage.removeItem(LS_LOGS_KEY);
  localStorage.removeItem(LS_ACTIVE_KEY);
}
