import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { getLuckyNumbersForActiveLog } from "../core/logStore.js";
import { $, createElement } from "../utils/dom.js";
import { runSpeedReverse } from "../core/speedReverse.js";
import { generatePermutationFromSpeed } from "../core/speedEngine.js";

let lastCandidates = null;
let lastRange = null;

export function initStats() {
  const basicRoot = $("#tab-basic-stats");
  const heatmapRoot = $("#tab-heatmap");
  const inferenceRoot = $("#tab-inference");
  const legacyRoot = $("#stats-root");

  // 基本統計區
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
    const placeholder = createElement("div", "stats-placeholder", "未來會顯示每格可能性強度");
    heatmapRoot.appendChild(title);
    heatmapRoot.appendChild(placeholder);
  }

  // 推理結果：逆推 Speed + Fast Filter
  if (inferenceRoot) {
    inferenceRoot.innerHTML = "";

    const title = createElement("div", "stats-section-title", "逆推 Speed（V2）");

    const form = createElement("div", "speed-form");
    const rangeRow = createElement("div", "control-row");

    const startLabel = createElement("span", "control-label", "起始 Speed：");
    const startInput = createElement("input", "input");
    startInput.type = "number";
    startInput.placeholder = "例如 30000";
    startInput.value = "0";

    const endLabel = createElement("span", "control-label", "結束 Speed：");
    const endInput = createElement("input", "input");
    endInput.type = "number";
    endInput.placeholder = "例如 39999";
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

    function renderCandidates(candidates, fromCount) {
      resultContainer.innerHTML = "";
      if (!candidates || candidates.length === 0) {
        const empty = createElement("div", "stats-placeholder", "目前沒有任何符合的 Speed。");
        resultContainer.appendChild(empty);
        summarySpan.textContent = fromCount != null
          ? `Speed 候選：${fromCount} → 0`
          : "";
        return;
      }

      const toCount = candidates.length;
      if (fromCount != null) {
        summarySpan.textContent = `Speed 候選：${fromCount} → ${toCount}`;
      } else {
        summarySpan.textContent = `Speed 候選：${toCount}`;
      }

      candidates.forEach((c) => {
        const block = createElement("div", "speed-candidate-block");
        const head = createElement(
          "div",
          "speed-candidate-head",
          `Speed：${c.speed}`
        );
        block.appendChild(head);

        if (c.majorPositions && c.majorPositions.length > 0) {
          const majorTitle = createElement("div", "speed-subtitle", "大獎位置：");
          block.appendChild(majorTitle);
          c.majorPositions.forEach((p) => {
            const line = createElement(
              "div",
              "speed-line",
              `號碼 ${p.num} → ${p.col} * ${p.row}`
            );
            block.appendChild(line);
          });
        }

        if (c.minorPositions && c.minorPositions.length > 0) {
          const minorTitle = createElement("div", "speed-subtitle", "小獎位置：");
          block.appendChild(minorTitle);
          c.minorPositions.forEach((p) => {
            const line = createElement(
              "div",
              "speed-line",
              `號碼 ${p.num} → ${p.col} * ${p.row}`
            );
            block.appendChild(line);
          });
        }

        resultContainer.appendChild(block);
      });
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
        lastRange = null;
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
        lastRange = null;
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
        lastRange = null;
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
      lastRange = { start, end };

      // 初次顯示：fromCount = null
      renderCandidates(lastCandidates, null);
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
        const grid = generatePermutationFromSpeed(s, total);

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

        // 重新計算 lucky 位置（避免盤面設定或格子調整後資訊不同）
        const lucky = getLuckyNumbersForActiveLog();
        const majors = (lucky && Array.isArray(lucky.major)) ? lucky.major : [];
        const minors = (lucky && Array.isArray(lucky.minor)) ? lucky.minor : [];

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

      renderCandidates(lastCandidates, fromCount);
    };
  }

  // 舊版 stats-root 相容處理：顯示基本統計
  if (legacyRoot) {
    const renderLegacy = () => {
      const stats = computeStats(store.getState());
      legacyRoot.innerHTML = `
        <div class="stats-section-title">基本統計</div>
        <div class="stats-line">已翻開格數：<strong>${stats.revealedCount}</strong> / ${stats.totalCells}</div>
      `;
    };
    renderLegacy();
    store.subscribe(renderLegacy);
  }
}
