import { GRID_PRESETS } from "../config/gridPresets.js";
import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initControls() {
  const root = $("#controls-root");
  root.innerHTML = "";

  const select = createElement("select", "select");
  GRID_PRESETS.forEach(p => {
    const o = createElement("option");
    o.value = p.id;
    o.textContent = p.label;
    select.appendChild(o);
  });
  select.value = store.getState().gridPresetId;
  select.onchange = () => store.setGridPreset(select.value);

  const reset = createElement("button", "btn", "重置全部");
  reset.onclick = () => confirm("確定清空？") && store.reset();

  root.appendChild(select);
  root.appendChild(reset);
}
