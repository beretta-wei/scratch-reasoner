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
});
