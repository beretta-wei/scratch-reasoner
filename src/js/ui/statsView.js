import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { getLuckyNumbersForActiveLog } from "../core/logStore.js";
import { $, createElement } from "../utils/dom.js";
import { runSpeedReverse } from "../core/speedReverse.js";
import { generatePermutationFromSpeed } from "../core/speedEngine.js";
import { initWorldModelView } from "./worldModelView.js";
import { getAdjTailRowsForTarget, scoreAllCellsForTargetTail } from "../core/adjTailModel.js";
import { runMonteCarloBaseline } from "../core/mcBaselineModel.js";

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



function buildMcBaselinePane(mcPane) {
  if (!mcPane) return () => {};

  mcPane.innerHTML = "";

  const container = createElement("div", "mc-root");
  const controls = createElement("div", "mc-controls");
  const resultWrapper = createElement("div", "mc-result-wrapper");
  const statusLine = createElement("div", "mc-status");

  const state = store.getState();
  const totalCells = state.rows * state.cols;

  // 大獎號輸入
  const prizeLabel = createElement("label", "mc-label");
  const prizeText = createElement("span", "", "大獎號：");
  const prizeInput = createElement("input", "input");
  prizeInput.type = "number";
  prizeInput.min = "1";
  prizeInput.max = String(totalCells);
  prizeInput.value = "88";
  prizeInput.style.width = "80px";
  prizeLabel.appendChild(prizeText);
  prizeLabel.appendChild(prizeInput);

  // 每方向模擬次數
  const runsLabel = createElement("label", "mc-label");
  const runsText = createElement("span", "", "每方向模擬次數：");
  const runsInput = createElement("input", "input");
  runsInput.type = "number";
  runsInput.min = "100";
  runsInput.max = "50000";
  runsInput.value = "5000";
  runsInput.style.width = "100px";
  runsLabel.appendChild(runsText);
  runsLabel.appendChild(runsInput);

  const runBtn = createElement("button", "btn-primary", "開始 Monte Carlo");
  runBtn.type = "button";

  controls.appendChild(prizeLabel);
  controls.appendChild(runsLabel);
  controls.appendChild(runBtn);

  container.appendChild(controls);
  container.appendChild(statusLine);
  container.appendChild(resultWrapper);
  mcPane.appendChild(container);

  function renderTable(probabilities) {
    resultWrapper.innerHTML = "";

    if (!probabilities || !probabilities.length) {
      const empty = createElement("div", "stats-placeholder", "尚未有模擬結果");
      resultWrapper.appendChild(empty);
      return;
    }

    const rows = probabilities.length;
    const cols = probabilities[0].length;

    const table = createElement("table", "mc-table");
    const tbody = createElement("tbody");

    for (let r = 0; r < rows; r++) {
      const tr = document.createElement("tr");
      for (let c = 0; c < cols; c++) {
        const td = document.createElement("td");
        const p = probabilities[r][c] * 100;
        td.textContent = p.toFixed(2) + "%";
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    resultWrapper.appendChild(table);
  }

  runBtn.onclick = () => {
    const currentState = store.getState();
    const rows = currentState.rows;
    const cols = currentState.cols;
    const total = rows * cols;

    const big = Number(prizeInput.value);
    const runs = Number(runsInput.value);

    if (!Number.isInteger(big) || big < 1 || big > total) {
      statusLine.textContent = `大獎號必須介於 1 ~ ${total}`;
      return;
    }
    if (!Number.isFinite(runs) || runs <= 0) {
      statusLine.textContent = "請輸入有效的模擬次數（例如 1000、5000）";
      return;
    }

    statusLine.textContent = "模擬中，可能需要一點時間…";
    resultWrapper.innerHTML = "";

    setTimeout(() => {
      try {
        const { probabilities, totalRuns } = runMonteCarloBaseline({
          rows,
          cols,
          bigNumber: big,
          runsPerDirection: runs,
        });
        statusLine.textContent = `完成：共 ${totalRuns} 次模擬（8 個方向 × 每方向 ${runs} 次）。`;
        renderTable(probabilities);
      } catch (err) {
        console.error(err);
        statusLine.textContent = "模擬發生錯誤：" + err.message;
      }
    }, 30);
  };

  renderTable(null);

  return () => {};
}


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


function buildPositionStats(candidates, kind) {
  // kind: "major" | "minor"
  const map = new Map();
  const totalSpeeds = candidates.length || 1;

  candidates.forEach((cand) => {
    const positions =
      kind === "major" ? cand.majorPositions || [] : cand.minorPositions || [];
    positions.forEach((p) => {
      const key = `${p.col}-${p.row}`;
      const prev = map.get(key) || { col: p.col, row: p.row, count: 0 };
      prev.count += 1;
      map.set(key, prev);
    });
  });

  const list = Array.from(map.values()).map((item) => {
    const ratio = (item.count / totalSpeeds) * 100;
    return {
      col: item.col,
      row: item.row,
      count: item.count,
      ratio,
    };
  });

  list.sort((a, b) => {
    if (b.ratio !== a.ratio) return b.ratio - a.ratio;
    if (b.count !== a.count) return b.count - a.count;
    const aval = a.col * 1000 + a.row;
    const bval = b.col * 1000 + b.row;
    return aval - bval;
  });

  return { stats: list, totalSpeeds };
}

function createStatsTable(titleText, rows, limit) {
  const container = createElement("div", "stats-block");

  if (titleText) {
    const title = createElement("div", "stats-subtitle", titleText);
    container.appendChild(title);
  }

  if (!rows || rows.length === 0) {
    const empty = createElement("div", "stats-placeholder", "目前沒有統計資料。");
    container.appendChild(empty);
    return container;
  }

  const table = createElement("table", "stats-table");
  const thead = createElement("thead");
  const headRow = createElement("tr");
  ["格子位置", "出現次數", "比例"].forEach((t) => {
    const th = createElement("th", "", t);
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = createElement("tbody");
  const take = typeof limit === "number" ? Math.min(limit, rows.length) : rows.length;
  for (let i = 0; i < take; i++) {
    const r = rows[i];
    const tr = createElement("tr");
    const posTd = createElement("td", "", `${r.col} * ${r.row}`);
    const countTd = createElement("td", "", `${r.count} 次`);
    const ratioTd = createElement("td", "", `${r.ratio.toFixed(0)}%`);
    tr.appendChild(posTd);
    tr.appendChild(countTd);
    tr.appendChild(ratioTd);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  container.appendChild(table);
  return container;
}

function createToggleSection(buttonText, fullRows) {
  const wrap = createElement("div", "stats-toggle-wrap");
  const btn = createElement("button", "btn-secondary", buttonText);
  const body = createElement("div", "stats-toggle-body");
  body.style.display = "none";

  btn.onclick = () => {
    const visible = body.style.display !== "none";
    body.style.display = visible ? "none" : "block";
  };

  wrap.appendChild(btn);

  if (!fullRows || fullRows.length === 0) {
    const empty = createElement("div", "stats-placeholder", "目前沒有統計資料。");
    body.appendChild(empty);
  } else {
    const table = createStatsTable("", fullRows, undefined);
    body.appendChild(table);
  }

  wrap.appendChild(body);
  return wrap;
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

  // 推理結果：逆推 Speed（V4，多模型）+ Fast Filter + 推薦格
  if (inferenceRoot) {
    inferenceRoot.innerHTML = "";

    const title = createElement("div", "stats-section-title", "逆推 Speed（V4 通用多模型）");

    const form = createElement("div", "speed-form");
    const rangeRow = createElement("div", "control-row");

    const startLabel = createElement("span", "control-label", "起始 Speed：");
    const startInput = createElement("input", "input");
    startInput.type = "number";
    startInput.placeholder = "例如 0";
    startInput.value = "0";

    const endLabel = createElement("span", "control-label", "結束 Speed：");
    const endInput = createElement("input", "input");
    endInput.type = "number";
    endInput.placeholder = "例如 9999";
    endInput.value = "9999";

    rangeRow.appendChild(startLabel);
    rangeRow.appendChild(startInput);
    rangeRow.appendChild(endLabel);
    rangeRow.appendChild(endInput);

    const btnRow = createElement("div", "control-row");
    const runBtn = createElement("button", "btn-primary", "執行逆推");
    const filterBtn = createElement("button", "btn-secondary", "重新比對現有 Speed");
    const statusSpan = createElement("span", "status-text", "");
    btnRow.appendChild(runBtn);
    btnRow.appendChild(filterBtn);
    btnRow.appendChild(statusSpan);

    const summaryRow = createElement("div", "control-row");
    const summarySpan = createElement("span", "status-text", "");
    summaryRow.appendChild(summarySpan);

    const resultContainer = createElement("div", "speed-result-container");

    form.appendChild(rangeRow);
    form.appendChild(btnRow);
    form.appendChild(summaryRow);

    inferenceRoot.appendChild(title);
    inferenceRoot.appendChild(form);
    inferenceRoot.appendChild(resultContainer);

    function renderAggregated(candidates, fromCount) {
      resultContainer.innerHTML = "";

      if (!candidates || candidates.length === 0) {
        summarySpan.textContent =
          fromCount != null
            ? `Speed 候選：${fromCount} → 0`
            : "目前沒有任何符合的 Speed。";
        const empty = createElement(
          "div",
          "stats-placeholder",
          "目前沒有任何符合的 Speed。"
        );
        resultContainer.appendChild(empty);
        return;
      }

      const toCount = candidates.length;
      if (fromCount != null) {
        summarySpan.textContent = `Speed 候選：${fromCount} → ${toCount}`;
      } else {
        summarySpan.textContent = `Speed 候選：${toCount}`;
      }

      const majorStatsInfo = buildPositionStats(candidates, "major");
      const minorStatsInfo = buildPositionStats(candidates, "minor");

      const majorTop = createStatsTable(
        "推薦刮點（大獎） TOP 10",
        majorStatsInfo.stats,
        10
      );
      resultContainer.appendChild(majorTop);

      const minorTop = createStatsTable(
        "推薦刮點（小獎） TOP 10",
        minorStatsInfo.stats,
        10
      );
      resultContainer.appendChild(minorTop);

      const majorAllSection = createToggleSection(
        "顯示全部 大獎列表",
        majorStatsInfo.stats
      );
      resultContainer.appendChild(majorAllSection);

      const minorAllSection = createToggleSection(
        "顯示全部 小獎列表",
        minorStatsInfo.stats
      );
      resultContainer.appendChild(minorAllSection);
    }

    runBtn.onclick = () => {
      const state = store.getState();
      const cols = state.cols;
      const rows = state.rows;
      const total = cols * rows;

      let start = parseInt(startInput.value, 10);
      let end = parseInt(endInput.value, 10);
      if (Number.isNaN(start)) start = 0;
      if (Number.isNaN(end)) end = start;
      if (end < start) {
        const tmp = start;
        start = end;
        end = tmp;
      }

      if (end - start > 50000) {
        statusSpan.textContent = "Speed 範圍過大，請縮小區間（最多 50,000 組）。";
        resultContainer.innerHTML = "";
        summarySpan.textContent = "";
        lastCandidates = null;
        return;
      }

      const revealedCells = state.cells.filter(
        (c) => c.revealed && typeof c.value === "number"
      );
      if (revealedCells.length === 0) {
        statusSpan.textContent = "目前尚未有已翻開的格子，無法進行逆推。";
        resultContainer.innerHTML = "";
        summarySpan.textContent = "";
        lastCandidates = null;
        return;
      }

      const lucky = getLuckyNumbersForActiveLog();
      const hasLucky =
        (lucky.major && lucky.major.length > 0) ||
        (lucky.minor && lucky.minor.length > 0);
      if (!hasLucky) {
        statusSpan.textContent = "請先在 Log 中設定大獎 / 小獎號碼。";
        resultContainer.innerHTML = "";
        summarySpan.textContent = "";
        lastCandidates = null;
        return;
      }

      statusSpan.textContent = `執行中（${start} ~ ${end}）…`;
      resultContainer.innerHTML = "";
      summarySpan.textContent = "";

      const result = runSpeedReverse({
        cols,
        rows,
        revealedCells,
        luckyNumbers: lucky,
        speedStart: start,
        speedEnd: end,
      });

      statusSpan.textContent = `已檢查 ${result.scannedCount} 組 Speed，符合條件：${result.matchedCount} 組`;

      lastCandidates = result.candidates || [];

      renderAggregated(lastCandidates, null);
    };

    filterBtn.onclick = () => {
      const state = store.getState();
      const cols = state.cols;
      const rows = state.rows;
      const total = cols * rows;

      if (!lastCandidates || lastCandidates.length === 0) {
        statusSpan.textContent = "尚未執行逆推，沒有可重新比對的 Speed。";
        return;
      }

      const fromCount = lastCandidates.length;

      const revealedCells = state.cells.filter(
        (c) => c.revealed && typeof c.value === "number"
      );
      if (revealedCells.length === 0) {
        statusSpan.textContent = "目前沒有已翻開的格子，無法重新比對。";
        return;
      }

      statusSpan.textContent = `重新比對現有 ${fromCount} 組 Speed…`;

      const nextCandidates = [];

      lastCandidates.forEach((cand) => {
        const s = cand.speed;
        const grid = generatePermutationFromSpeed(s, cols, rows);

        let ok = true;
        for (let i = 0; i < revealedCells.length; i++) {
          const cell = revealedCells[i];
          const idx = cell.index;
          const v = cell.value;
          if (idx < 0 || idx >= total) continue;
          if (grid[idx] !== v) {
            ok = false;
            break;
          }
        }
        if (!ok) {
          return;
        }

        const lucky = getLuckyNumbersForActiveLog();
        const majors =
          lucky && Array.isArray(lucky.major) ? lucky.major : [];
        const minors =
          lucky && Array.isArray(lucky.minor) ? lucky.minor : [];

        const majorPositions = [];
        const minorPositions = [];

        if (majors.length > 0) {
          majors.forEach((num) => {
            for (let idx = 0; idx < total; idx++) {
              if (grid[idx] === num) {
                const col = (idx % cols) + 1;
                const row = Math.floor(idx / cols) + 1;
                majorPositions.push({ num, col, row });
              }
            }
          });
        }

        if (minors.length > 0) {
          minors.forEach((num) => {
            for (let idx = 0; idx < total; idx++) {
              if (grid[idx] === num) {
                const col = (idx % cols) + 1;
                const row = Math.floor(idx / cols) + 1;
                minorPositions.push({ num, col, row });
              }
            }
          });
        }

        nextCandidates.push({
          speed: s,
          majorPositions,
          minorPositions,
        });
      });

      nextCandidates.sort((a, b) => a.speed - b.speed);
      lastCandidates = nextCandidates;

      statusSpan.textContent = `重新比對完畢，剩餘：${lastCandidates.length} 組。`;

      renderAggregated(lastCandidates, fromCount);
    };


    // === 建立「逆推 Speed」與「世界模型 v1」子頁籤 ===
    const existingChildren = Array.from(inferenceRoot.childNodes);
    inferenceRoot.innerHTML = "";

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
    const mcTabBtn = createElement(
      "button",
      "stats-subtab-btn",
      "MC 基準（亂數）"
    );
    tabsHeader.appendChild(speedTabBtn);
    tabsHeader.appendChild(worldTabBtn);
    tabsHeader.appendChild(tailTabBtn);
    tabsHeader.appendChild(mcTabBtn);

    const tabsContent = createElement("div", "stats-subtabs-content");
    const speedPane = createElement(
      "div",
      "stats-subtab-pane stats-subtab-pane--active"
    );
    const worldPane = createElement("div", "stats-subtab-pane");
    const tailPane = createElement("div", "stats-subtab-pane");
    const mcPane = createElement("div", "stats-subtab-pane");


    existingChildren.forEach((child) => {
      speedPane.appendChild(child);
    });

    tabsContent.appendChild(speedPane);
    tabsContent.appendChild(worldPane);
    tabsContent.appendChild(tailPane);
    tabsContent.appendChild(mcPane);

    inferenceRoot.appendChild(tabsHeader);
    inferenceRoot.appendChild(tabsContent);

    // 初始化世界模型畫面（放在右側子頁籤），並取得重新計算函式
    const renderWorldModel = initWorldModelView(worldPane);
    // 初始化尾號分析 TailFlow 畫面（第三個子頁籤）
    const renderTailFlow = buildTailFlowPane(tailPane);
    // 初始化 Monte Carlo baseline 畫面（第四個子頁籤）
    const renderMcBaseline = buildMcBaselinePane(mcPane);

    const switchTab = (active) => {
      if (active === "speed") {
        speedTabBtn.classList.add("stats-subtab-btn--active");
        worldTabBtn.classList.remove("stats-subtab-btn--active");
        tailTabBtn.classList.remove("stats-subtab-btn--active");
        mcTabBtn.classList.remove("stats-subtab-btn--active");
        speedPane.style.display = "";
        worldPane.style.display = "none";
        tailPane.style.display = "none";
        mcPane.style.display = "none";
      } else if (active === "world") {
        speedTabBtn.classList.remove("stats-subtab-btn--active");
        worldTabBtn.classList.add("stats-subtab-btn--active");
        tailTabBtn.classList.remove("stats-subtab-btn--active");
        mcTabBtn.classList.remove("stats-subtab-btn--active");
        speedPane.style.display = "none";
        worldPane.style.display = "";
        tailPane.style.display = "none";
        mcPane.style.display = "none";
        if (typeof renderWorldModel === "function") {
          renderWorldModel();
        }
      } else if (active === "tail") {
        speedTabBtn.classList.remove("stats-subtab-btn--active");
        worldTabBtn.classList.remove("stats-subtab-btn--active");
        tailTabBtn.classList.add("stats-subtab-btn--active");
        mcTabBtn.classList.remove("stats-subtab-btn--active");
        speedPane.style.display = "none";
        worldPane.style.display = "none";
        tailPane.style.display = "";
        mcPane.style.display = "none";
        if (typeof renderTailFlow === "function") {
          renderTailFlow();
        }
      } else if (active === "mc") {
        speedTabBtn.classList.remove("stats-subtab-btn--active");
        worldTabBtn.classList.remove("stats-subtab-btn--active");
        tailTabBtn.classList.remove("stats-subtab-btn--active");
        mcTabBtn.classList.add("stats-subtab-btn--active");
        speedPane.style.display = "none";
        worldPane.style.display = "none";
        tailPane.style.display = "none";
        mcPane.style.display = "";
        if (typeof renderMcBaseline === "function") {
          renderMcBaseline();
        }
      }
    };

    switchTab("speed");
    speedTabBtn.onclick = () => switchTab("speed");
    worldTabBtn.onclick = () => switchTab("world");
    tailTabBtn.onclick = () => switchTab("tail");
    mcTabBtn.onclick = () => switchTab("mc");

  }
}
