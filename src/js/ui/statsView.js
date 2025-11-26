import { store } from "../core/state.js";
import { computeStats } from "../core/inferenceEngine.js";
import { $ } from "../utils/dom.js";

export function initStats() {
  const basicRoot = $("#tab-basic-stats");
  const heatmapRoot = $("#tab-heatmap");
  const inferenceRoot = $("#tab-inference");
  const legacyRoot = $("#stats-root");

  const render = () => {
    const stats = computeStats(store.getState());

    if (basicRoot) {
      basicRoot.innerHTML = `
        <div class="stats-section-title">基本統計</div>
        <div class="stats-placeholder">
          已刮出：${stats.revealedCount} / ${stats.totalCells} 格
        </div>
      `;
    }

    if (heatmapRoot) {
      heatmapRoot.innerHTML = `
        <div class="stats-section-title">Heatmap（待實作）</div>
        <div class="stats-placeholder">未來會顯示每格可能性強度</div>
      `;
    }

    if (inferenceRoot) {
      inferenceRoot.innerHTML = `
        <div class="stats-section-title">推理結果（待實作）</div>
        <div class="stats-placeholder">目前僅顯示基本統計</div>
      `;
    }

    // 向下相容：如果舊版 stats-root 仍存在，照舊渲染整塊內容
    if (!basicRoot && legacyRoot) {
      legacyRoot.innerHTML = `
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
    }
  };

  render();
  store.subscribe(render);
}
