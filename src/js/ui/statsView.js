import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { $, createElement } from "../utils/dom.js";
import { getAdjTailRowsForTarget, scoreAllCellsForTargetTail } from "../core/adjTailModel.js";

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

  // 控制列
  const controlBar = createElement("div", "tailflow-controls");

  // 目標尾號
  const targetLabel = createElement("label", "tailflow-label", "目標尾號");
  const targetSelect = createElement("select", "tailflow-select");
  for (let t = 0; t <= 9; t++) {
    const opt = createElement("option", "", String(t));
    opt.value = String(t);
    if (t === 5) opt.selected = true;
    targetSelect.appendChild(opt);
  }
  targetLabel.appendChild(targetSelect);

  // 距離上限
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

  // 方向篩選
  const dirLabel = createElement("label", "tailflow-label", "方向");
  const dirSelect = createElement("select", "tailflow-select");
  [
    { value: "all", text: "全部" },
    { value: "straight", text: "直向/橫向" },
    { value: "diag", text: "斜向" }
  ].forEach((cfg) => {
    const opt = createElement("option", "", cfg.text);
    opt.value = cfg.value;
    dirSelect.appendChild(opt);
  });
  dirLabel.appendChild(dirSelect);

  // 只顯示 hit > 0
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

  // 內容區：關聯清單 / 推薦格 / Heatmap 一起顯示（分段）
  const listSection = createElement("div", "tailflow-section");
  const listTitle = createElement("div", "tailflow-section-title", "尾號關聯清單");
  const tableContainer = createElement("div", "tailflow-table-container");
  listSection.appendChild(listTitle);
  listSection.appendChild(tableContainer);

  const topSection = createElement("div", "tailflow-section");
  const topHeader = createElement("div", "tailflow-section-header");
  const topTitle = createElement("div", "tailflow-section-title", "推薦格 Top N");
  const topControls = createElement("div", "tailflow-top-controls");
  const topLabel = createElement("span", "", "顯示前");
  const topSelect = createElement("select", "tailflow-select");
  [5, 10, 20].forEach((n) => {
    const opt = createElement("option", "", String(n));
    opt.value = String(n);
    if (n === 10) opt.selected = true;
    topSelect.appendChild(opt);
  });
  const topSuffix = createElement("span", "", "格");
  topControls.appendChild(topLabel);
  topControls.appendChild(topSelect);
  topControls.appendChild(topSuffix);
  topHeader.appendChild(topTitle);
  topHeader.appendChild(topControls);
  const topTableContainer = createElement("div", "tailflow-table-container");
  topSection.appendChild(topHeader);
  topSection.appendChild(topTableContainer);

  const heatSection = createElement("div", "tailflow-section");
  const heatTitle = createElement("div", "tailflow-section-title", "Heatmap（尾號熱度分佈）");
  const heatContainer = createElement("div", "tailflow-heatmap-container");
  heatSection.appendChild(heatTitle);
  heatSection.appendChild(heatContainer);

  container.appendChild(controlBar);
  container.appendChild(listSection);
  container.appendChild(topSection);
  container.appendChild(heatSection);
  tailPane.appendChild(container);

  const state = {
    targetTail: 5,
    maxDistance: Infinity,
    dirFilter: "all",
    onlyHit: false,
    topN: 10
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

  // 清單：列出 fromTail → targetTail 的統計
  const renderList = () => {
    const targetTail = state.targetTail;
    const rows = getAdjTailRowsForTarget(targetTail) || [];
    const filtered = rows.filter((r) => {
      if (!Number.isFinite(state.maxDistance)) {
        // 不限距離，不過濾 distance
      } else if (r.distance > state.maxDistance) {
        return false;
      }
      if (!filterDir(r.dirId)) return false;
      if (state.onlyHit && r.hit <= 0) return false;
      return true;
    });

    tableContainer.innerHTML = "";
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
    tableContainer.appendChild(table);
  };

  // 推薦格 TopN
  const renderTop = () => {
    topTableContainer.innerHTML = "";

    const scores = scoreAllCellsForTargetTail(state.targetTail, state.maxDistance) || [];
    if (!scores || scores.length === 0) {
      const empty = createElement("div", "stats-placeholder", "目前沒有可評估的格子。");
      topTableContainer.appendChild(empty);
      return;
    }

    const topN = state.topN;
    const filtered = scores.filter((x) => x.score > 0);
    const picked = filtered.slice(0, topN);

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
    picked.forEach((item, idx) => {
      const tr = createElement("tr");
      const rankTd = createElement("td", "", String(idx + 1));
      const coordTd = createElement("td", "", `r${item.row + 1}-c${item.col + 1}`);
      const scoreTd = createElement("td", "", item.score.toFixed(2));

      tr.appendChild(rankTd);
      tr.appendChild(coordTd);
      tr.appendChild(scoreTd);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    topTableContainer.appendChild(table);
  };

  // Heatmap
  const renderHeat = () => {
    heatContainer.innerHTML = "";

    const { rows, cols, cells } = store.getState();
    if (!rows || !cols || !Array.isArray(cells) || cells.length === 0) {
      const empty = createElement("div", "stats-placeholder", "目前沒有盤面資料。");
      heatContainer.appendChild(empty);
      return;
    }

    const scores = scoreAllCellsForTargetTail(state.targetTail, state.maxDistance) || [];
    if (!scores || scores.length === 0) {
      const empty = createElement("div", "stats-placeholder", "尚未有可計算的分數。");
      heatContainer.appendChild(empty);
      return;
    }

    let maxScore = 0;
    const scoreMap = new Map();
    scores.forEach((item) => {
      scoreMap.set(item.index, item.score);
      if (item.score > maxScore) maxScore = item.score;
    });
    if (maxScore <= 0) maxScore = 1;

    const grid = createElement("div", "tailflow-heatmap-grid");
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let idx = 0; idx < cells.length; idx++) {
      const cellDiv = createElement("div", "tailflow-heat-cell");
      const s = scoreMap.get(idx) || 0;
      if (s > 0) {
        const ratio = Math.min(1, s / maxScore);
        const alpha = 0.15 + ratio * 0.75;
        cellDiv.style.backgroundColor = `rgba(249, 115, 22, ${alpha.toFixed(2)})`;
        cellDiv.textContent = s.toFixed(1);
      } else {
        cellDiv.style.backgroundColor = "rgba(15, 23, 42, 0.9)";
        cellDiv.textContent = "";
      }
      grid.appendChild(cellDiv);
    }

    heatContainer.appendChild(grid);
  };

  const render = () => {
    renderList();
    renderTop();
    renderHeat();
  };

  // 控制事件
  targetSelect.addEventListener("change", () => {
    state.targetTail = Number(targetSelect.value);
    render();
  });
  distSelect.addEventListener("change", () => {
    state.maxDistance =
      distSelect.value === "Infinity" ? Infinity : Number(distSelect.value);
    render();
  });
  dirSelect.addEventListener("change", () => {
    state.dirFilter = dirSelect.value;
    render();
  });
  onlyHitInput.addEventListener("change", () => {
    state.onlyHit = !!onlyHitInput.checked;
    render();
  });
  topSelect.addEventListener("change", () => {
    state.topN = Number(topSelect.value);
    render();
  });

  render();

  return render;
}

export function initStats() {
  const basicRoot = $("#tab-basic-stats");
  const heatmapRoot = $("#tab-heatmap");
  const inferenceRoot = $("#tab-inference");
  const legacyRoot = $("#stats-root");

  // 基本統計區塊
  const renderBasic = () => {
    if (!basicRoot) return;
    const stats = computeStats(store.getState());
    basicRoot.innerHTML = "";
    const title = createElement("div", "stats-section-title", "基本統計");
    const body = createElement("div", "stats-basic-block");
    body.innerHTML = `
      <div class="stats-line">已翻開格數：<strong>${stats.revealedCount}</strong> / ${stats.totalCells}</div>
    `;
    basicRoot.appendChild(title);
    basicRoot.appendChild(body);
  };

  renderBasic();
  store.subscribe(renderBasic);

  // Heatmap 佔位
  if (heatmapRoot) {
    heatmapRoot.innerHTML = "";
    const title = createElement("div", "stats-section-title", "Heatmap（待實作）");
    const placeholder = createElement(
      "div",
      "stats-placeholder",
      "未來會顯示每格可能性強度"
    );
    heatmapRoot.appendChild(title);
    heatmapRoot.appendChild(placeholder);
  }

  // 推理結果：僅保留尾號分析 TailFlow
  if (inferenceRoot) {
    inferenceRoot.innerHTML = "";
    const title = createElement("div", "stats-section-title", "尾號分析 TailFlow");
    const tailPane = createElement("div", "stats-subtab-pane stats-subtab-pane--active");

    inferenceRoot.appendChild(title);
    inferenceRoot.appendChild(tailPane);

    buildTailFlowPane(tailPane);
  }
}
