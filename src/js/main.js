import { initLogStore } from "./core/logStore.js";
import { initControls } from "./ui/controlsView.js";
import { initGrid } from "./ui/gridView.js";
import { initStats } from "./ui/statsView.js";
import { initNumberPad } from "./ui/numberPadView.js";

document.addEventListener("DOMContentLoaded", () => {
  initLogStore();
  initControls();
  initGrid();
  initStats();
  initNumberPad();

  // Auto-restore active log after UI init
  setTimeout(() => {
    try {
      const { activeLogId } = getLogState();
      if (activeLogId) {
        setActiveLog(activeLogId);
      }
    } catch(e) { console.error(e); }
  }, 0);
});
