import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { $, createElement } from "../utils/dom.js";

export function initStats() {
  const root = $("#stats-root");

  const render = () => {
    const stats = computeStats(store.getState());
    root.innerHTML = `
      <div class="stats-section-title">基本統計</div>
      <div class="stats-placeholder">
        已刮出：${stats.revealedCount} / ${stats.totalCells} 格
      </div>
      <hr>
      <div class="stats-section-title">Heatmap（待實作）</div>
      <div class="stats-placeholder">未來會顯示每格可能性強度</div>
      <hr>
      <div class="stats-section-title">推理結果（待實作）</div>
      <div class="stats-placeholder">目前僅顯示基本統計</div>
    `;
  };

  render();
  store.subscribe(render);
}
