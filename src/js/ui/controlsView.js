import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initControls() {
  const presetSelect = $("#preset-select");

  // ✅ 若不存在，安全跳過
  if (presetSelect) {
    presetSelect.onchange = (e) => {
      const preset = e.target.value;
      store.setPreset(preset);
    };
  }

  // ===== Index 顯示切換開關 =====
  const controlsContainer = $(".controls");
  const indexToggleWrapper = createElement("label", "control-toggle");
  const indexToggle = createElement("input");
  indexToggle.type = "checkbox";
  indexToggle.checked = false; // ✅ 預設 OFF
  indexToggle.onchange = (e) => {
    store.setShowIndex(e.target.checked);
  };
  const indexLabel = createElement("span", "control-label");
  indexLabel.textContent = "顯示格子序號";

  indexToggleWrapper.appendChild(indexToggle);
  indexToggleWrapper.appendChild(indexLabel);
  controlsContainer.appendChild(indexToggleWrapper);
}
