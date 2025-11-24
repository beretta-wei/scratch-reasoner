import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { $, createElement } from "../utils/dom.js";

export function initStats() {
  const root = $("#stats-root");
  if (!root) return;

  const render = (state) => {
    const stats = computeStats(state);
    root.innerHTML = "";

    // 基本統計
    const basicSection = createElement("div");
    const basicTitle = createElement("div", "stats-section-title", "基本統計");
    const basicContent = createElement(
      "div",
      "stats-placeholder",
      `已刮出：${stats.revealedCount} / ${stats.totalCells} 格`
    );
    basicSection.appendChild(basicTitle);
    basicSection.appendChild(basicContent);

    // heatmap placeholder
    const heatmapSection = createElement("div");
    const heatmapTitle = createElement("div", "stats-section-title", "Heatmap（待實作）");
    const heatmapContent = createElement(
      "div",
      "stats-placeholder",
      "未來會在這裡顯示每一格的可能性顏色強度。"
    );
    heatmapSection.appendChild(heatmapTitle);
    heatmapSection.appendChild(heatmapContent);

    // 信心度 + 下一格推薦 placeholder
    const logicSection = createElement("div");
    const logicTitle = createElement("div", "stats-section-title", "推理結果（待實作）");
    const logicContent = createElement(
      "div",
      "stats-placeholder",
      stats.confidenceSummary
    );
    logicSection.appendChild(logicTitle);
    logicSection.appendChild(logicContent);

    root.appendChild(basicSection);
    root.appendChild(document.createElement("hr"));
    root.appendChild(heatmapSection);
    root.appendChild(document.createElement("hr"));
    root.appendChild(logicSection);
  };

  render(store.getState());
  store.subscribe(render);
}
