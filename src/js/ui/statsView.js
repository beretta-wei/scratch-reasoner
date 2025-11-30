import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { getLuckyNumbersForActiveLog } from "../core/logStore.js";
import { $, createElement } from "../utils/dom.js";
import { runSpeedReverse } from "../core/speedReverse.js";

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

  // Heatmap 先保留佔位
  if (heatmapRoot) {
    heatmapRoot.innerHTML = "";
    const title = createElement("div", "stats-section-title", "Heatmap（待實作）");
    const placeholder = createElement("div", "stats-placeholder", "未來會顯示每格可能性強度");
    heatmapRoot.appendChild(title);
    heatmapRoot.appendChild(placeholder);
  }

  // 逆推 Speed 區塊：放在 推理結果 Tab
  if (inferenceRoot) {
    inferenceRoot.innerHTML = "";

    const title = createElement("div", "stats-section-title", "逆推 Speed（V1）");

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
    const statusSpan = createElement("span", "status-text", "");
    btnRow.appendChild(runBtn);
    btnRow.appendChild(statusSpan);

    const resultContainer = createElement("div", "speed-result-container");

    form.appendChild(rangeRow);
    form.appendChild(btnRow);

    inferenceRoot.appendChild(title);
    inferenceRoot.appendChild(form);
    inferenceRoot.appendChild(resultContainer);

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

      // 避免一次範圍太大，給個簡單保護（例如 50000 個以內）
      if (end - start > 50000) {
        statusSpan.textContent = "Speed 範圍過大，請縮小區間（最多 50,000 組）。";
        resultContainer.innerHTML = "";
        return;
      }

      const revealedCells = state.cells.filter(c => c.revealed && typeof c.value === "number");
      if (revealedCells.length === 0) {
        statusSpan.textContent = "目前尚未有已翻開的格子，無法進行逆推。";
        resultContainer.innerHTML = "";
        return;
      }

      const lucky = getLuckyNumbersForActiveLog();
      const hasLucky = (lucky.major && lucky.major.length > 0) || (lucky.minor && lucky.minor.length > 0);
      if (!hasLucky) {
        statusSpan.textContent = "請先在 Log 中設定大獎 / 小獎號碼。";
        resultContainer.innerHTML = "";
        return;
      }

      statusSpan.textContent = `執行中（${start} ~ ${end}）…`;
      resultContainer.innerHTML = "";

      const result = runSpeedReverse({
        cols,
        rows,
        revealedCells,
        luckyNumbers: lucky,
        speedStart: start,
        speedEnd: end
      });

      statusSpan.textContent = `已檢查 ${result.scannedCount} 組 Speed，符合條件：${result.matchedCount} 組`;

      if (result.candidates.length === 0) {
        const empty = createElement("div", "stats-placeholder", "目前區間內無任何符合的 Speed。");
        resultContainer.appendChild(empty);
        return;
      }

      result.candidates.forEach(c => {
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
          c.majorPositions.forEach(p => {
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
          c.minorPositions.forEach(p => {
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
    };
  }

  // 若還有舊版 stats-root，維持簡單兼容（顯示基本統計）
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
