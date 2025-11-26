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
  getLogsForCurrentView
} from "../core/logStore.js";

export function initControls() {
  const root = $("#controls-root");
  root.innerHTML = "";

  const state = store.getState();
  const logState = getLogState();

  // === 建立 Tabs 結構 ===
  const tabsHeader = createElement("div", "tabs-header");
  const tabsContent = createElement("div", "tabs-content");

  const tabConfigs = [
    { id: "tab-settings", label: "盤面設定" },
    { id: "tab-logs", label: "Log 管理" },
    { id: "tab-heatmap", label: "Heatmap" },
    { id: "tab-inference", label: "推理結果" }
  ];

  const panes = {};

  tabConfigs.forEach((tab, index) => {
    const btn = createElement("button", "tab-btn", tab.label);
    btn.dataset.tab = tab.id;
    if (index === 0) {
      btn.classList.add("active");
    }
    tabsHeader.appendChild(btn);

    const pane = createElement("div", "tab-pane");
    pane.id = tab.id;
    if (index === 0) {
      pane.classList.add("active");
    }
    panes[tab.id] = pane;
    tabsContent.appendChild(pane);
  });

  // 點擊切換 Tab
  tabsHeader.addEventListener("click", (ev) => {
    const btn = ev.target.closest(".tab-btn");
    if (!btn) return;
    const targetId = btn.dataset.tab;
    if (!targetId) return;

    // 更新按鈕樣式
    tabsHeader.querySelectorAll(".tab-btn").forEach(b => {
      if (b === btn) {
        b.classList.add("active");
      } else {
        b.classList.remove("active");
      }
    });

    // 更新內容面板
    Object.entries(panes).forEach(([id, pane]) => {
      if (id === targetId) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });
  });

  root.appendChild(tabsHeader);
  root.appendChild(tabsContent);

  // ========== Tab 1：盤面設定 ==========
  const settingsPane = panes["tab-settings"];

  // 上排：模板選擇 + 顯示格子序號
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

  settingsPane.appendChild(topRow);

  // 基本統計容器（提供給 statsView 使用）
  const basicStatsContainer = createElement("div", "stats-basic-container");
  basicStatsContainer.id = "tab-basic-stats";
  settingsPane.appendChild(basicStatsContainer);

  // ========== Tab 2：Log 管理 ==========
  const logsPane = panes["tab-logs"];

  // 名稱選擇 + 新增
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
        const first = logs[0];
        logSelect.value = first.id;
        setActiveLog(first.id);
      }
    }
    renderActiveLogLabel();
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

  logsPane.appendChild(labelRow);

  // Log 選擇 + 建立
  const logRow = createElement("div", "control-row");
  const logTitle = createElement("span", "control-label", "Log：");

  const logSelect = createElement("select", "select");
  const createLogBtn = createElement("button", "btn", "建立 Log");

  logRow.appendChild(logTitle);
  logRow.appendChild(logSelect);
  logRow.appendChild(createLogBtn);

  logsPane.appendChild(logRow);

  // 底部：目前作用中 Log + 儲存位置說明 + 重置
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
  bottomRow.appendChild(resetBtn);
  const clearStorageBtn = createElement("button", "btn", "清除本機資料");
  clearStorageBtn.onclick = () => {
    if (!window.confirm("確定要清除所有 Log 與本機資料？此操作無法復原。")) return;
    clearAllLogsFromStorage();
    store.reset();
    renderLogsSelect();
    renderActiveLogLabel();
  };
  bottomRow.appendChild(clearStorageBtn);


  logsPane.appendChild(bottomRow);

  // 建立 Log 的 click handler
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

  // 初始化 Log 下拉與狀態
  renderLogsSelect();

  // ========== Tab 3 & 4：由 statsView.js 負責填入內容 ==========
}
