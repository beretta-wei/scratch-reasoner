import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initControls() {
  const presetSelect = $("#preset-select");

  // 若下拉存在則啟用，否則忽略
  if (presetSelect) {
    presetSelect.onchange = (e) => {
      const preset = e.target.value;
      store.setPreset(preset);
    };
  }

  const controlsContainer = $(".controls") || $("#controls-root");

  // Index 顯示切換
  if (controlsContainer) {
    const indexToggleWrapper = createElement("label", "control-toggle");
    const indexToggle = createElement("input");
    indexToggle.type = "checkbox";
    indexToggle.checked = false; // 預設 OFF

    indexToggle.onchange = (e) => {
      store.setShowIndex(e.target.checked);
    };

    const indexLabel = createElement("span", "control-label");
    indexLabel.textContent = "顯示格子序號";

    indexToggleWrapper.appendChild(indexToggle);
    indexToggleWrapper.appendChild(indexLabel);
    controlsContainer.appendChild(indexToggleWrapper);
  }
}
