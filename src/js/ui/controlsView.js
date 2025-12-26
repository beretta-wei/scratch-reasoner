import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import {
  getLogState,
  setCurrentLabelName,
  addLabelName,
  createLogForCurrentState,
  clearAllLogsFromStorage,
  getLuckyNumbersForActiveLog,
  setLuckyNumbersForActiveLog,
  buildExportPayloadForActiveLog,
  buildExportPayloadForAllLogs,
  setActiveLog,
  clearActiveLog,
  getLogsForCurrentView
} from "../core/logStore.js";


function downloadJsonFile(filename, dataObj) {
  if (!dataObj) return;
  const json = JSON.stringify(dataObj, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
    { id: "tab-cloud", label: "雲端Log分析" },
    { id: "tab-block-analysis", label: "區塊分析" },
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


  // 大獎 / 小獎號碼設定區
  const luckySection = createElement("div", "lucky-section");

  const majorRow = createElement("div", "control-row");
  const majorLabel = createElement("span", "control-label", "大獎號碼");
  const majorDisplay = createElement("button", "btn lucky-display", "尚未選擇");
  majorRow.appendChild(majorLabel);
  majorRow.appendChild(majorDisplay);

  const minorRow = createElement("div", "control-row");
  const minorLabel = createElement("span", "control-label", "小獎號碼");
  const minorDisplay = createElement("button", "btn lucky-display", "尚未選擇");
  minorRow.appendChild(minorLabel);
  minorRow.appendChild(minorDisplay);

  luckySection.appendChild(majorRow);
  luckySection.appendChild(minorRow);

  settingsPane.appendChild(luckySection);

  function refreshLuckyDisplays() {
    const state = getLogState();
    if (!state.activeLogId) {
      majorDisplay.textContent = "需先選擇 Log";
      minorDisplay.textContent = "需先選擇 Log";
      return;
    }
    const ln = getLuckyNumbersForActiveLog();
    majorDisplay.textContent =
      ln.major && ln.major.length ? ln.major.join(", ") : "尚未選擇";
    minorDisplay.textContent =
      ln.minor && ln.minor.length ? ln.minor.join(", ") : "尚未選擇";
  }

  let luckyOverlay = null;
  let luckySheet = null;
  let luckyGrid = null;
  let luckyConfirmBtn = null;
  let luckyCancelBtn = null;
  let currentLuckyType = null;
  let currentLuckySelection = new Set();

  function ensureLuckyOverlay() {
    if (luckyOverlay) return;

    luckyOverlay = createElement("div", "number-pad-overlay");
    luckySheet = createElement("div", "number-pad-sheet");
    const titleEl = createElement("div", "number-pad-header");

    luckyGrid = createElement("div", "number-pad-grid");

    const actions = createElement("div", "number-pad-actions");
    luckyConfirmBtn = createElement("button", "btn", "確定");
    luckyCancelBtn = createElement("button", "btn btn-secondary", "取消");

    actions.appendChild(luckyConfirmBtn);
    actions.appendChild(luckyCancelBtn);

    luckySheet.appendChild(titleEl);
    luckySheet.appendChild(luckyGrid);
    luckySheet.appendChild(actions);

    luckyOverlay.appendChild(luckySheet);
    document.body.appendChild(luckyOverlay);

    luckyOverlay.addEventListener("click", (e) => {
      if (e.target === luckyOverlay) {
        closeLuckyOverlay();
      }
    });

    luckyCancelBtn.onclick = () => {
      closeLuckyOverlay();
    };

    luckyConfirmBtn.onclick = () => {
      const numbers = Array.from(currentLuckySelection);
      setLuckyNumbersForActiveLog(currentLuckyType, numbers);
      closeLuckyOverlay();
      refreshLuckyDisplays();
    };

    function closeLuckyOverlay() {
      if (!luckyOverlay) return;
      luckyOverlay.classList.remove("number-pad-overlay--open");
      currentLuckyType = null;
      currentLuckySelection = new Set();
      document.body.style.overflow = "";
    }
  }

  function openLuckyPicker(type) {
    const state = getLogState();
    if (!state.activeLogId) {
      window.alert("請先在 Log 管理中選擇或建立一個 Log。");
      return;
    }

    ensureLuckyOverlay();

    currentLuckyType = type;
    currentLuckySelection = new Set();
    const ln = getLuckyNumbersForActiveLog();
    const seed = type === "major" ? ln.major : ln.minor;

    seed.forEach((n) => currentLuckySelection.add(n));

    const s = store.getState();
    const total = s.cols * s.rows;

    const titleText = type === "major" ? "選擇大獎號碼" : "選擇小獎號碼";
    const titleEl = luckySheet.querySelector(".number-pad-header");
    titleEl.textContent = `${titleText}（1 ~ ${total}）`;

    luckyGrid.innerHTML = "";
    for (let n = 1; n <= total; n++) {
      const btn = createElement("button", "number-pad-number-btn", String(n));
      btn.dataset.num = String(n);
      if (currentLuckySelection.has(n)) {
        btn.classList.add("number-pad-number-btn--selected");
      }
      btn.onclick = () => {
        const num = Number(btn.dataset.num);
        if (currentLuckySelection.has(num)) {
          currentLuckySelection.delete(num);
          btn.classList.remove("number-pad-number-btn--selected");
        } else {
          currentLuckySelection.add(num);
          btn.classList.add("number-pad-number-btn--selected");
        }
      };
      luckyGrid.appendChild(btn);
    }

    document.body.style.overflow = "hidden";
    luckyOverlay.classList.add("number-pad-overlay--open");
  }

  majorDisplay.onclick = () => openLuckyPicker("major");
  minorDisplay.onclick = () => openLuckyPicker("minor");

  // 初始顯示
  refreshLuckyDisplays();

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
    refreshLuckyDisplays();
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
    refreshLuckyDisplays();
  };
  bottomRow.appendChild(clearStorageBtn);

  const exportCurrentBtn = createElement("button", "btn", "匯出此 Log");
  exportCurrentBtn.onclick = () => {
    const state = getLogState();
    if (!state.activeLogId) {
      window.alert("目前沒有可匯出的 Log。");
      return;
    }
    const payload = buildExportPayloadForActiveLog();
    if (!payload) {
      window.alert("目前沒有可匯出的 Log。");
      return;
    }
    const safeName = (payload.labelName || "Log").replace(/[^\w\-]+/g, "_");
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");
    const filename = `log_${safeName}_${ts}.json`;
    downloadJsonFile(filename, payload);
    window.alert("Log 已匯出成功！");
  };
  bottomRow.appendChild(exportCurrentBtn);

  const exportAllBtn = createElement("button", "btn", "匯出全部 Log");
  exportAllBtn.onclick = () => {
    const state = getLogState();
    if (!state.logs || state.logs.length === 0) {
      window.alert("目前沒有可匯出的 Log。");
      return;
    }
    const payload = buildExportPayloadForAllLogs();
    if (!payload || !payload.logs || payload.logs.length === 0) {
      window.alert("目前沒有可匯出的 Log。");
      return;
    }
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
      "-",
      String(now.getHours()).padStart(2, "0"),
      String(now.getMinutes()).padStart(2, "0"),
      String(now.getSeconds()).padStart(2, "0")
    ].join("");
    const filename = `logs_all_${ts}.json`;
    downloadJsonFile(filename, payload);
    window.alert("全部 Log 已匯出成功！");
  };
  bottomRow.appendChild(exportAllBtn);

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
    refreshLuckyDisplays();
  };

  // 初始化 Log 下拉與狀態
  renderLogsSelect();

  // ========== Tab 雲端Log分析 ==========
  const cloudPane = panes["tab-cloud"];

  const cloudHeader = createElement("div", "section-title", "雲端 Log 分析");
  cloudPane.appendChild(cloudHeader);

  const cloudDesc = createElement("p", "cloud-desc");
  cloudDesc.textContent = "根據目前盤面與選擇的名稱，從雲端 logs.json 中篩選出符合條件的 Log，並列出歷史大獎 / 小獎位置。";
  cloudPane.appendChild(cloudDesc);

  const cloudSummaryRow = createElement("div", "control-row");
  const ownerLabel = createElement("span", "control-label");
  const stateForCloud = store.getState();
  const currentTotalCells = stateForCloud.cols * stateForCloud.rows;
  const logStateForCloud = getLogState();
  const currentOwner = (logStateForCloud.currentLabelName || "").trim();

  if (!currentOwner) {
    ownerLabel.textContent = "請先在「Log 管理」中選擇名稱，才能進行雲端分析。";
    cloudSummaryRow.appendChild(ownerLabel);
    cloudPane.appendChild(cloudSummaryRow);
  } else {
    ownerLabel.textContent = "目前名稱：" + currentOwner + "，盤面格數：" + currentTotalCells + " 格";
    cloudSummaryRow.appendChild(ownerLabel);

    const cloudCountSpan = createElement("span", "cloud-count");
    cloudCountSpan.style.marginLeft = "0.5rem";
    cloudSummaryRow.appendChild(cloudCountSpan);

    cloudPane.appendChild(cloudSummaryRow);

    const cloudSelectRow = createElement("div", "control-row");
    const cloudSelectLabel = createElement("span", "control-label", "雲端 Log 清單：");
    const cloudSelect = createElement("select", "select");
    cloudSelect.disabled = true; // 僅顯示用
    cloudSelectRow.appendChild(cloudSelectLabel);
    cloudSelectRow.appendChild(cloudSelect);
    cloudPane.appendChild(cloudSelectRow);

    const cloudResults = createElement("div", "cloud-results");
    cloudPane.appendChild(cloudResults);

    fetch("src/logs/logs.json")
      .then((res) => res.json())
      .then((data) => {
        const files = Array.isArray(data.files) ? data.files : [];
        cloudCountSpan.textContent = "（雲端共 " + files.length + " 筆）";

        cloudSelect.innerHTML = "";
        files.forEach((f) => {
          const opt = document.createElement("option");
          opt.value = f.path;
          opt.textContent = f.label || f.path;
          cloudSelect.appendChild(opt);
        });

        if (files.length === 0) {
          cloudResults.textContent = "目前 logs.json 中沒有任何雲端 Log。";
          return;
        }

        // 篩選：同一個人名 + 同一格數
        const targetOwner = currentOwner;
        const targetTotal = currentTotalCells;

        const filteredMeta = files.filter((f) => {
          const label = f.label || "";
          const parts = label.split("｜");
          if (parts.length < 2) return false;
          const owner = parts[0].trim();
          const gridPart = parts[1] || "";
          const numMatch = gridPart.replace(/[^0-9]/g, "");
          const gridNum = numMatch ? parseInt(numMatch, 10) : NaN;
          if (!gridNum || Number.isNaN(gridNum)) return false;
          return owner === targetOwner && gridNum === targetTotal;
        });

        if (filteredMeta.length === 0) {
          cloudResults.textContent = "沒有符合目前名稱與盤面格數的雲端 Log。";
          return;
        }

        // 讀取所有符合的檔案
        const loadPromises = filteredMeta.map((meta) => {
          const url = "src/logs/" + meta.path;
          return fetch(url)
            .then((res) => res.json())
            .then((json) => ({ meta, json }))
            .catch(() => null);
        });

        Promise.all(loadPromises).then((items) => {
          const valid = items.filter((it) => it && it.json);

          if (valid.length === 0) {
            cloudResults.textContent = "雲端 Log 讀取失敗，請確認檔案格式。";
            return;
          }

          const processed = [];

          valid.forEach((item) => {
            const meta = item.meta;
            const data = item.json || {};
            let log = data;

            if (Array.isArray(data.logs) && data.logs.length > 0) {
              log = data.logs[0];
            }

            const cols = log.cols || stateForCloud.cols || 1;
            const rows = log.rows || stateForCloud.rows || 1;
            const total = cols * rows;

            const lucky = log.luckyNumbers || {};
            const majors = Array.isArray(lucky.major) ? [...lucky.major] : [];
            const minors = Array.isArray(lucky.minor) ? [...lucky.minor] : [];

            const createdAt = log.createdAt || meta.path || "";

            processed.push({
              meta,
              cols,
              rows,
              total,
              majors,
              minors,
              createdAt
            });
          });

          // 依時間排序（舊 -> 新）
          processed.sort((a, b) => {
            const va = String(a.createdAt);
            const vb = String(b.createdAt);
            return va.localeCompare(vb);
          });

          cloudResults.innerHTML = "";

          processed.forEach((item) => {
            const wrap = createElement("div", "cloud-item");

            const title = createElement("div", "cloud-title");
            title.textContent = item.meta.label || item.meta.path;
            wrap.appendChild(title);

            const info = createElement("div", "cloud-info");
            info.textContent =
              "盤面：" +
              item.rows +
              " x " +
              item.cols +
              "（" +
              item.total +
              "格）";
            wrap.appendChild(info);

            const majorsBlock = createElement("div", "cloud-section");
            const majorsHeader = createElement(
              "div",
              "cloud-subtitle",
              "大獎（" + item.majors.length + " 個）"
            );
            majorsBlock.appendChild(majorsHeader);

            const majorsBody = createElement("div", "cloud-body");
            const sortedMajors = item.majors.slice().sort((a, b) => a - b);
            sortedMajors.forEach((idx) => {
              const c = (idx % item.cols) + 1;
              const r = Math.floor(idx / item.cols) + 1;
              const line = createElement(
                "div",
                "cloud-line",
                c + " * " + r
              );
              majorsBody.appendChild(line);
            });
            majorsBlock.appendChild(majorsBody);
            wrap.appendChild(majorsBlock);

            const minorsBlock = createElement("div", "cloud-section");
            const minorsHeader = createElement(
              "div",
              "cloud-subtitle",
              "小獎（" + item.minors.length + " 個）"
            );
            minorsBlock.appendChild(minorsHeader);

            const minorsBody = createElement("div", "cloud-body");
            const sortedMinors = item.minors.slice().sort((a, b) => a - b);
            sortedMinors.forEach((idx) => {
              const c = (idx % item.cols) + 1;
              const r = Math.floor(idx / item.cols) + 1;
              const line = createElement(
                "div",
                "cloud-line",
                c + " * " + r
              );
              minorsBody.appendChild(line);
            });
            minorsBlock.appendChild(minorsBody);
            wrap.appendChild(minorsBlock);

            cloudResults.appendChild(wrap);
          });
        });
      })
      .catch(() => {
        cloudResults.textContent = "無法載入 logs.json，請確認路徑與檔案內容。";
      });
  }


  // ========== Tab 3 & 4：由 statsView.js 負責填入內容 ==========
}
