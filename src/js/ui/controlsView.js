import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import {
  getLogState,
  subscribeLog,
  addLabelName,
  createLogForCurrentState,
  setActiveLog,
  clearActiveLog,
} from "../core/logStore.js";

export function initControls() {
  const root = $("#controls-root");
  root.innerHTML = "";

  // ===== 模板選擇 =====
  const presetSelect = createElement("select", "select");
  GRID_PRESETS.forEach((p) => {
    const o = createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    presetSelect.appendChild(o);
  });
  presetSelect.value = store.getState().gridPresetId;
  presetSelect.onchange = () => {
    const newId = presetSelect.value;
    store.setGridPreset(newId);
    clearActiveLog(); // 切換模板後，需重新選擇或建立 Log
  };

  // ===== 名稱選擇 + 新增 =====
  const nameWrapper = createElement("div", "control-row");
  const nameLabel = createElement("span", "control-label", "名稱：");
  const nameSelect = createElement("select", "select");
  const nameAddBtn = createElement("button", "btn btn-ghost", "+ 名稱");

  const refreshNameOptions = () => {
    const { labels } = getLogState();
    nameSelect.innerHTML = "";
    labels.forEach((name) => {
      const opt = createElement("option");
      opt.value = name;
      opt.textContent = name;
      nameSelect.appendChild(opt);
    });
  };

  nameAddBtn.onclick = () => {
    const input = window.prompt("請輸入新名稱：");
    if (!input) return;
    addLabelName(input);
    refreshNameOptions();
    nameSelect.value = input.trim();
  };

  refreshNameOptions();
  nameWrapper.appendChild(nameLabel);
  nameWrapper.appendChild(nameSelect);
  nameWrapper.appendChild(nameAddBtn);

  // ===== Log 選擇與建立 =====
  const logWrapper = createElement("div", "control-row");
  const logLabel = createElement("span", "control-label", "Log：");

  const logSelect = createElement("select", "select");
  const logCreateBtn = createElement("button", "btn", "建立 Log");

  const activeInfo = createElement("div", "control-active-log");

  const refreshLogOptions = () => {
    const { logs } = getLogState();
    const state = store.getState();
    const total = state.cols * state.rows;
    const currentName = nameSelect.value;

    logSelect.innerHTML = "";

    const filtered = logs
      .filter((l) => l.labelName === currentName && l.cols * l.rows === total)
      .sort((a, b) => b.createdAt - a.createdAt);

    filtered.forEach((log) => {
      const opt = createElement("option");
      opt.value = log.id;
      opt.textContent = log.id;
      logSelect.appendChild(opt);
    });
  };

  logCreateBtn.onclick = () => {
    const name = nameSelect.value;
    if (!name) {
      window.alert("請先選擇或新增名稱，再建立 Log。");
      return;
    }
    const log = createLogForCurrentState(name);
    refreshLogOptions();
    if (log) {
      logSelect.value = log.id;
      activeInfo.textContent = `目前編輯：${log.id}`;
    }
  };

  logSelect.onchange = () => {
    if (!logSelect.value) return;
    setActiveLog(logSelect.value);
    activeInfo.textContent = `目前編輯：${logSelect.value}`;
  };

  logWrapper.appendChild(logLabel);
  logWrapper.appendChild(logSelect);
  logWrapper.appendChild(logCreateBtn);

  // ===== 重置按鈕 =====
  const reset = createElement("button", "btn", "重置全部");
  reset.onclick = () => {
    if (!window.confirm("確定清空目前格子？")) return;
    store.reset();
  };

  // 監聽 log 狀態變化（例如由其他地方更新）
  subscribeLog(() => {
    // 名稱清單只有在新增名稱時才會變動，這裡只需要更新 Log 清單與目前狀態
    refreshLogOptions();
    const { activeLogId } = getLogState();
    if (activeLogId) {
      activeInfo.textContent = `目前編輯：${activeLogId}`;
    } else {
      activeInfo.textContent = "目前尚未選擇 Log";
    }
  });

  // 初始化顯示
  refreshLogOptions();
  const { activeLogId } = getLogState();
  if (activeLogId) {
    activeInfo.textContent = `目前編輯：${activeLogId}`;
  } else {
    activeInfo.textContent = "目前尚未選擇 Log";
  }

  // ===== 組裝到畫面 =====
  root.appendChild(presetSelect);
  root.appendChild(nameWrapper);
  root.appendChild(logWrapper);
  root.appendChild(activeInfo);
  root.appendChild(reset);
}
