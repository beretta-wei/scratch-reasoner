import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import { openNumberPadForCell } from "./numberPadView.js";

let gridRoot = null;

export function initGrid() {
  gridRoot = $("#grid-root");
  store.subscribe(renderGrid);
  renderGrid();
}

function renderGrid() {
  if (!gridRoot) return;
  const { rows, cols, cells, showIndex } = store.getState();

  gridRoot.innerHTML = "";
  const wrapper = createElement("div", "grid-wrapper");

  // 先放左上角空白
  const corner = createElement("div", "grid-corner");
  wrapper.appendChild(corner);

  // 欄標
  for (let c = 1; c <= cols; c++) {
    const colLabel = createElement("div", "grid-col-label");
    colLabel.textContent = c;
    wrapper.appendChild(colLabel);
  }

  // 每一列
  for (let r = 1; r <= rows; r++) {
    const rowLabel = createElement("div", "grid-row-label");
    rowLabel.textContent = r;
    wrapper.appendChild(rowLabel);

    for (let c = 1; c <= cols; c++) {
      const index0 = (r - 1) * cols + (c - 1); // 0-based
      const cell = cells[index0];

      const cellEl = createElement("div", "grid-cell");

      if (cell && cell.value != null) {
        cellEl.textContent = cell.value;
        cellEl.classList.add("grid-cell--revealed");
      }

      if (showIndex) {
        const idxEl = createElement("div", "grid-cell-index");
        idxEl.textContent = index0 + 1; // 顯示 1-based
        cellEl.appendChild(idxEl);
      }

      cellEl.onclick = () => {
        openNumberPadForCell(index0);
      };

      wrapper.appendChild(cellEl);
    }
  }

  gridRoot.appendChild(wrapper);
}
