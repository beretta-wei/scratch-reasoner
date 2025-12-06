import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { getLuckyNumbersForActiveLog } from "../core/logStore.js";
import { $, createElement } from "../utils/dom.js";
import { runSpeedReverse } from "../core/speedReverse.js";
import { generatePermutationFromSpeed } from "../core/speedEngine.js";
import { initWorldModelView } from "./worldModelView.js";
import { getAdjTailRowsForTarget, scoreAllCellsForTargetTail } from "../core/adjTailModel.js";

let lastCandidates = null;

const TAILFLOW_DIR_LABELS = {
  R: "右",
  L: "左",
  U: "上",
  D: "下",
  UR: "右上",
  UL: "左上",
  DR: "右下",
  DL: "左下",
};


function buildTailFlowPane(tailPane) {
  if (!tailPane) return () => {};

  tailPane.innerHTML = "";

  const container = createElement("div", "tailflow-root");

  // === 控制列 ===
  const controlBar = createElement("div", "tailflow-controls");

  const targetLabel = createElement("label", "tailflow-label", "目標尾號");
  const targetSelect = createElement("select", "tailflow-select");
  for (let t = 0; t <= 9; t++) {
    const opt = createElement("option", "", String(t));
    opt.value = String(t);
    if (t === 5) opt.selected = true;
    targetSelect.appendChild(opt);
  }
  targetLabel.appendChild(targetSelect);

  const distLabel = createElement("label", "tailflow-label", "距離上限");
  const distSelect = createElement("select", "tailflow-select");
  [
    { v: "Infinity", t: "不限" },
    { v: "1", t: "1 格" },
    { v: "2", t: "1 ~ 2 格" },
    { v: "3", t: "1 ~ 3 格" },
    { v: "4", t: "1 ~ 4 格" }
  ].forEach((cfg) => {
    const opt = createElement("option", "", cfg.t);
    opt.value = cfg.v;
    if (cfg.v === "Infinity") opt.selected = true;
    distSelect.appendChild(opt);
  });
  distLabel.appendChild(distSelect);

  const dirLabel = createElement("label", "tailflow-label", "方向");
  const dirSelect = createElement("select", "tailflow-select");
  [
    { value: "all", text: "全部" },
    { value: "straight", text: "直向/橫向" },
    { value: "diag", text: "斜向" },
  ].forEach((optCfg) => {
    const opt = createElement("option", "", optCfg.text);
    opt.value = optCfg.value;
    dirSelect.appendChild(opt);
  });
  dirLabel.appendChild(dirSelect);

  const onlyHitLabel = createElement("label", "tailflow-label tailflow-checkbox-label");
  const onlyHitInput = createElement("input");
  onlyHitInput.type = "checkbox";
  onlyHitLabel.appendChild(onlyHitInput);
  const onlyHitText = createElement("span", "", "只顯示 hit > 0");
  onlyHitLabel.appendChild(onlyHitText);

  controlBar.appendChild(targetLabel);
  controlBar.appendChild(distLabel);
  controlBar.appendChild(dirLabel);
  controlBar.appendChild(onlyHitLabel);

  // === 內部子視圖 tabs ===
  const viewsTabs = createElement("div", "tailflow-views-tabs");
  const listTabBtn = createElement("button", "tailflow-view-tab tailflow-view-tab--active", "關聯清單");
  const topTabBtn = createElement("button", "tailflow-view-tab", "推薦格 TopN");
  const heatTabBtn = createElement("button", "tailflow-view-tab", "Heatmap");

  viewsTabs.appendChild(listTabBtn);
  viewsTabs.appendChild(topTabBtn);
  viewsTabs.appendChild(heatTabBtn);

  // === 三個視圖容器 ===
  const listView = createElement("div", "tailflow-view tailflow-view--list");
  const listTableContainer = createElement("div", "tailflow-table-container");
  listView.appendChild(listTableContainer);

  const topView = createElement("div", "tailflow-view tailflow-view--top");
  const topControls = createElement("div", "tailflow-top-controls");
  const topLabel = createElement("label", "tailflow-label", "顯示前 N 名");
  const topSelect = createElement("select", "tailflow-select");
  [5, 10, 20].forEach((n) => {
    const opt = createElement("option", "", String(n));
    opt.value = String(n);
    if (n === 10) opt.selected = true;
    topSelect.appendChild(opt);
  });
  topLabel.appendChild(topSelect);
  topControls.appendChild(topLabel);
  const topTableContainer = createElement("div", "tailflow-table-container");
  topView.appendChild(topControls);
  topView.appendChild(topTableContainer);

  const heatView = createElement("div", "tailflow-view tailflow-view--heatmap");
  const heatGrid = createElement("div", "tailflow-heatmap-grid");
  heatView.appendChild(heatGrid);

  container.appendChild(controlBar);
  container.appendChild(viewsTabs);
  container.appendChild(listView);
  container.appendChild(topView);
  container.appendChild(heatView);
  tailPane.appendChild(container);

  const state = {
    targetTail: 5,
    maxDistance: Infinity,
    dirFilter: "all",
    onlyHit: false,
  };

  const filterDir = (dirId) => {
    if (state.dirFilter === "all") return true;
    if (state.dirFilter === "straight") {
      return dirId === "R" || dirId === "L" || dirId === "U" || dirId === "D";
    }
    if (state.dirFilter === "diag") {
      return dirId === "UR" || dirId === "UL" || dirId === "DR" || dirId === "DL";
    }
    return true;
  };

  const switchView = (view) => {
    const allTabs = [listTabBtn, topTabBtn, heatTabBtn];
    const allViews = [listView, topView, heatView];
    allTabs.forEach((btn) => btn.classList.remove("tailflow-view-tab--active"));
    allViews.forEach((v) => (v.style.display = "none"));

    if (view === "list") {
      listTabBtn.classList.add("tailflow-view-tab--active");
      listView.style.display = "";
    } else if (view === "top") {
      topTabBtn.classList.add("tailflow-view-tab--active");
      topView.style.display = "";
    } else if (view === "heat") {
      heatTabBtn.classList.add("tailflow-view-tab--active");
      heatView.style.display = "";
    }
  };

  listTabBtn.onclick = () => switchView("list");
  topTabBtn.onclick = () => switchView("top");
  heatTabBtn.onclick = () => switchView("heat");

  const renderList = () => {
    const targetTail = state.targetTail;
    const rows = getAdjTailRowsForTarget(targetTail) || [];
    const filtered = rows.filter((r) => {
      if (!filterDir(r.dirId)) return false;
      if (Number.isFinite(state.maxDistance) && r.distance > state.maxDistance) return false;
      if (state.onlyHit && r.hit <= 0) return false;
      return true;
    });

    listTableContainer.innerHTML = "";
    const table = createElement("table", "tailflow-table");
    const thead = createElement("thead");
    const headRow = createElement("tr");
    ["目標尾號", "起點尾號", "方向", "距離", "hit", "score"].forEach((t) => {
      const th = createElement("th", "", t);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement("tbody");
    filtered.forEach((r) => {
      const tr = createElement("tr");
      const tdTarget = createElement("td", "", String(r.targetTail));
      const tdFrom = createElement("td", "", String(r.fromTail));
      const tdDir = createElement("td", "", TAILFLOW_DIR_LABELS[r.dirId] || r.dirId);
      const tdDist = createElement("td", "", `${r.distance}`);
      const tdHit = createElement("td", "", `${r.hit}`);
      const tdScore = createElement("td", "", r.score.toFixed(2));

      tr.appendChild(tdTarget);
      tr.appendChild(tdFrom);
      tr.appendChild(tdDir);
      tr.appendChild(tdDist);
      tr.appendChild(tdHit);
      tr.appendChild(tdScore);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    listTableContainer.appendChild(table);
  };

  const renderTop = () => {
    const n = Number(topSelect.value) || 10;
    const targetTail = state.targetTail;
    const maxDistance = state.maxDistance;
    const scores = scoreAllCellsForTargetTail(
      targetTail,
      Number.isFinite(maxDistance) ? maxDistance : Infinity
    );

    topTableContainer.innerHTML = "";
    if (!scores || !scores.length) return;

    const table = createElement("table", "tailflow-table");
    const thead = createElement("thead");
    const headRow = createElement("tr");
    ["排名", "座標", "score"].forEach((t) => {
      const th = createElement("th", "", t);
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = createElement("tbody");
    const slice = scores.slice(0, n);
    slice.forEach((item, idx) => {
      const tr = createElement("tr");
      const coordText = `r${item.row + 1}-c${item.col + 1}`;
      const tdRank = createElement("td", "", String(idx + 1));
      const tdCoord = createElement("td", "", coordText);
      const tdScore = createElement("td", "", item.score.toFixed(2));

      tr.appendChild(tdRank);
      tr.appendChild(tdCoord);
      tr.appendChild(tdScore);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    topTableContainer.appendChild(table);
  };

  const renderHeat = () => {
    const { rows, cols } = store.getState();
    heatGrid.innerHTML = "";
    if (!rows || !cols) return;

    const maxDistance = state.maxDistance;
    const scores = scoreAllCellsForTargetTail(
      state.targetTail,
      Number.isFinite(maxDistance) ? maxDistance : Infinity
    );
    const scoreMap = new Map();
    let maxScore = 0;
    scores.forEach((item) => {
      scoreMap.set(item.index, item.score);
      if (item.score > maxScore) maxScore = item.score;
    });

    heatGrid.style.display = "grid";
    heatGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    heatGrid.style.gap = "2px";

    const totalCells = rows * cols;
    for (let index = 0; index < totalCells; index++) {
      const cellDiv = createElement("div", "tailflow-heat-cell");
      const s = scoreMap.get(index) || 0;
      if (s > 0 && maxScore > 0) {
        const ratio = Math.min(1, s / maxScore);
        cellDiv.style.background = `rgba(249, 115, 22, ${0.15 + ratio * 0.7})`;
        cellDiv.textContent = s.toFixed(1);
      } else {
        cellDiv.style.background = "rgba(15, 23, 42, 0.9)";
        cellDiv.textContent = "";
      }
      heatGrid.appendChild(cellDiv);
    }
  };

  const renderAll = () => {
    renderList();
    renderTop();
    renderHeat();
  };

  targetSelect.addEventListener("change", () => {
    state.targetTail = Number(targetSelect.value);
    renderAll();
  });
  distSelect.addEventListener("change", () => {
    state.maxDistance =
      distSelect.value === "Infinity" ? Infinity : Number(distSelect.value);
    renderAll();
  });
  dirSelect.addEventListener("change", () => {
    state.dirFilter = dirSelect.value;
    renderAll();
  });
  onlyHitInput.addEventListener("change", () => {
    state.onlyHit = !!onlyHitInput.checked;
    renderAll();
  });
  topSelect.addEventListener("change", () => {
    renderTop();
  });

  switchView("list");
  renderAll();

  return renderAll;
}


const tabsHeader = createElement("div", "stats-subtabs-header");
    const speedTabBtn = createElement(
      "button",
      "stats-subtab-btn stats-subtab-btn--active",
      "逆推 Speed"
    );
    const worldTabBtn = createElement(
      "button",
      "stats-subtab-btn",
      "世界模型 v1"
    );
    const tailTabBtn = createElement(
      "button",
      "stats-subtab-btn",
      "尾號分析 TailFlow"
    );
    tabsHeader.appendChild(speedTabBtn);
    tabsHeader.appendChild(worldTabBtn);
    tabsHeader.appendChild(tailTabBtn);

    const tabsContent = createElement("div", "stats-subtabs-content");
    const speedPane = createElement(
      "div",
      "stats-subtab-pane stats-subtab-pane--active"
    );
    const worldPane = createElement("div", "stats-subtab-pane");
    const tailPane = createElement("div", "stats-subtab-pane");


    existingChildren.forEach((child) => {
      speedPane.appendChild(child);
    });

    tabsContent.appendChild(speedPane);
    tabsContent.appendChild(worldPane);
    tabsContent.appendChild(tailPane);

    inferenceRoot.appendChild(tabsHeader);
    inferenceRoot.appendChild(tabsContent);

    // 初始化世界模型畫面（放在右側子頁籤），並取得重新計算函式
    const renderWorldModel = initWorldModelView(worldPane);
    // 初始化尾號分析 TailFlow 畫面（第三個子頁籤）
    const renderTailFlow = buildTailFlowPane(tailPane);

    const switchTab = (active) => {
      if (active === "speed") {
        speedTabBtn.classList.add("stats-subtab-btn--active");
        worldTabBtn.classList.remove("stats-subtab-btn--active");
        tailTabBtn.classList.remove("stats-subtab-btn--active");
        speedPane.style.display = "";
        worldPane.style.display = "none";
        tailPane.style.display = "none";
      } else if (active === "world") {
        speedTabBtn.classList.remove("stats-subtab-btn--active");
        worldTabBtn.classList.add("stats-subtab-btn--active");
        tailTabBtn.classList.remove("stats-subtab-btn--active");
        speedPane.style.display = "none";
        worldPane.style.display = "";
        tailPane.style.display = "none";
        if (typeof renderWorldModel === "function") {
          renderWorldModel();
        }
      } else if (active === "tail") {
        speedTabBtn.classList.remove("stats-subtab-btn--active");
        worldTabBtn.classList.remove("stats-subtab-btn--active");
        tailTabBtn.classList.add("stats-subtab-btn--active");
        speedPane.style.display = "none";
        worldPane.style.display = "none";
        tailPane.style.display = "";
        if (typeof renderTailFlow === "function") {
          renderTailFlow();
        }
      }
    };

    switchTab("speed");
    speedTabBtn.onclick = () => switchTab("speed");
    worldTabBtn.onclick = () => switchTab("world");
    tailTabBtn.onclick = () => switchTab("tail");

  }
}
