import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import {
  getLogState,
  setCurrentLabelName,
  addLabelName,
  createLogForCurrentState,
  setActiveLog,
  clearActiveLog,
  clearAllLogsFromStorage,
  getLogsForCurrentView
} from "../core/logStore.js";

export function initControls() {
  const root = $("#controls-root");
  root.innerHTML = "";

  const state = store.getState();
  const logState = getLogState();

  // === 上排：模板選擇 + 顯示格子序號 ===
  const topRow = createElement("div", "control-row");

  const presetSelect = createElement("select", "select");
  GRID_PRESETS.forEach(p => {
    const o = createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    presetSelect.appendChild(o);
  });
  presetSelect.value = state.gridPresetId;
  presetSelect.onchange = () => {
    clearActiveLog();
    store.setGridPreset(presetSelect.value);
  };

  const indexToggleWrapper = createElement("label", "control-toggle");
  const indexToggle = createElement("input");
  indexToggle.type = "checkbox";
  indexToggle.checked = state.showIndex;
  indexToggle.onchange = () => {
    store.setShowIndex(indexToggle.checked);
  };
  const indexLabel = createElement("span", "control-label");
  indexLabel.textContent = "顯示格子序號";

  indexToggleWrapper.appendChild(indexToggle);
  indexToggleWrapper.appendChild(indexLabel);

  topRow.appendChild(presetSelect);
  topRow.appendChild(indexToggleWrapper);

  // === 中排：名稱選擇 + 新增 ===
  const labelRow = createElement("div", "control-row");
  const labelTitle = createElement("span", "control-label", "名稱：");

  const labelSelect = createElement("select", "select");
  logState.labelNames.forEach(name => {
    const opt = createElement("option");
    opt.value = name;
    opt.textContent = name;
    labelSelect.appendChild(opt);
  });
  if (logState.currentLabelName && logState.labelNames.includes(logState.currentLabelName)) {
    labelSelect.value = logState.currentLabelName;
  }

  labelSelect.onchange = () => {
    setCurrentLabelName(labelSelect.value);
    renderLogsSelect();
  };

  const addLabelBtn = createElement("button", "btn", "+ 名稱");
  addLabelBtn.onclick = () => {
    const input = window.prompt("請輸入新的名稱：");
    if (!input) return;
    addLabelName(input);
    const updated = getLogState();
    labelSelect.innerHTML = "";
    updated.labelNames.forEach(name => {
      const opt = createElement("option");
      opt.value = name;
      opt.textContent = name;
      labelSelect.appendChild(opt);
    });
    labelSelect.value = updated.currentLabelName;
    renderLogsSelect();
  };

  labelRow.appendChild(labelTitle);
  labelRow.appendChild(labelSelect);
  labelRow.appendChild(addLabelBtn);

  // === 下排：Log 選擇 + 建立 ===
  const logRow = createElement("div", "control-row");
  const logTitle = createElement("span", "control-label", "Log：");

  const logSelect = createElement("select", "select");
  const createLogBtn = createElement("button", "btn", "建立 Log");

  function renderLogsSelect() {
    const logs = getLogsForCurrentView();
    const { activeLogId } = getLogState();
    logSelect.innerHTML = "";
    if (logs.length === 0) {
      const opt = createElement("option");
      opt.value = "";
      opt.textContent = "（尚無 Log）";
      logSelect.appendChild(opt);
      logSelect.disabled = true;
    } else {
      logSelect.disabled = false;
      logs.forEach(log => {
        const opt = createElement("option");
        opt.value = log.id;
        opt.textContent = log.id;
        logSelect.appendChild(opt);
      });
      if (activeLogId && logs.some(l => l.id === activeLogId)) {
        logSelect.value = activeLogId;
      } else {
        logSelect.selectedIndex = 0;
      }
    }
    renderActiveLogLabel();
  }

  createLogBtn.onclick = () => {
    const log = createLogForCurrentState();
    if (!log) {
      window.alert("請先選擇名稱再建立 Log。");
      return;
    }
    renderLogsSelect();
  };

  logSelect.onchange = () => {
    const id = logSelect.value;
    if (!id) return;
    setActiveLog(id);
    renderActiveLogLabel();
  };

  logRow.appendChild(logTitle);
  logRow.appendChild(logSelect);
  logRow.appendChild(createLogBtn);

  // === 底部：目前作用中 Log + 儲存位置說明 + 重置 ===
  const bottomRow = createElement("div", "control-row");
  const activeLabel = createElement("div", "control-active-log");

  function renderActiveLogLabel() {
    const { activeLogId } = getLogState();
    if (activeLogId) {
      activeLabel.textContent = "目前編輯：" + activeLogId + "（儲存於本機瀏覽器 localStorage）";
    } else {
      activeLabel.textContent = "目前尚未選擇 Log（儲存位置：本機瀏覽器 localStorage）";
    }
  }

  const resetBtn = createElement("button", "btn", "重置全部");
  resetBtn.onclick = () => {
    if (!window.confirm("確定清空目前格子內容？")) return;
    store.reset();
  };

  bottomRow.appendChild(activeLabel);
  
const clearStorageBtn = createElement("button", "btn", "清除本機資料");
clearStorageBtn.onclick = () => {
  if (!window.confirm("確定要清除所有 Log 與本機資料？此操作無法復原。")) return;
  clearAllLogsFromStorage();
  store.reset();
  renderLogsSelect();
};
bottomRow.appendChild(clearStorageBtn);
bottomRow.appendChild(resetBtn);

  // === 渲染一開始的 Log 下拉與狀態 ===
  renderLogsSelect();

  root.appendChild(topRow);
  root.appendChild(labelRow);
  root.appendChild(logRow);
  root.appendChild(bottomRow);
}
