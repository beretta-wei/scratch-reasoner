import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initControls() {
  const root = $("#controls-root");
  if (!root) return;

  root.innerHTML = "";

  const label = createElement("label");
  label.textContent = "版型：";

  const select = createElement("select", "select");
  for (const preset of GRID_PRESETS) {
    const option = createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    select.appendChild(option);
  }
  select.value = store.getState().gridPresetId;

  select.addEventListener("change", () => {
    store.setGridPreset(select.value);
  });

  const resetBtn = createElement("button", "btn");
  resetBtn.type = "button";
  resetBtn.textContent = "重置全部";

  resetBtn.addEventListener("click", () => {
    if (confirm("確定要重置所有格子嗎？")) {
      store.reset();
    }
  });

  label.appendChild(select);
  root.appendChild(label);
  root.appendChild(resetBtn);
}
