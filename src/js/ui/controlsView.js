import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initControls() {
  const root = $("#controls-root");
  root.innerHTML = "";

  // 模板選擇
  const select = createElement("select", "select");
  GRID_PRESETS.forEach(p => {
    const o = createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    select.appendChild(o);
  });
  select.value = store.getState().gridPresetId;
  select.onchange = () => store.setGridPreset(select.value);

  // 顯示格子序號開關（預設關閉）
  const indexToggleWrapper = createElement("label", "control-toggle");
  const indexToggle = createElement("input");
  indexToggle.type = "checkbox";
  indexToggle.checked = false;
  indexToggle.onchange = () => {
    store.setShowIndex(indexToggle.checked);
  };
  const indexLabel = createElement("span", "control-label");
  indexLabel.textContent = "顯示格子序號";

  indexToggleWrapper.appendChild(indexToggle);
  indexToggleWrapper.appendChild(indexLabel);

  const reset = createElement("button", "btn", "重置全部");
  reset.onclick = () => confirm("確定清空？") && store.reset();

  root.appendChild(select);
  root.appendChild(indexToggleWrapper);
  root.appendChild(reset);
}
