import { initLogStore, getLogState, setActiveLog } from "./core/logStore.js";
import { initControls } from "./ui/controlsView.js";
import { initGrid } from "./ui/gridView.js";
import { initStats } from "./ui/statsView.js";
import { initBlockAnalysis } from "./ui/blockAnalysisView.js";
import { initNumberPad } from "./ui/numberPadView.js";
import { initAdjTailModel } from "./core/adjTailModel.js";

document.addEventListener("DOMContentLoaded", () => {
  initLogStore();
  initControls();
  initGrid();
  initStats();
  initBlockAnalysis();
  initNumberPad();
  initAdjTailModel();
});

  // Auto-restore active log after UI init
  setTimeout(() => {
    try {
      const { activeLogId } = getLogState();
      if (activeLogId) {
        setActiveLog(activeLogId);
      }
    } catch(e) { console.error(e); }
  }, 0);
