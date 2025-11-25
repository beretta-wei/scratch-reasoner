import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import { openNumberPadForCell } from "./numberPadView.js";

let gridEl = null;

export function initGrid() {
  gridEl = $("#grid-root");
  store.subscribe(renderGrid);
  renderGrid();
}

function renderGrid() {
  if (!gridEl) return;

  const state = store.getState();
  const { rows, cols, cells, showIndex } = state;

  gridEl.innerHTML = "";

  const wrapper = createElement("div", "grid-wrapper");
  wrapper.style.display = "grid";
  wrapper.style.gridTemplateColumns =
    "auto repeat(" + String(cols) + ", var(--cell-size))";
  wrapper.style.gridTemplateRows =
    "auto repeat(" + String(rows) + ", var(--cell-size))";
  wrapper.style.gap = "4px";

  // 左上角空白
  wrapper.appendChild(createElement("div", "grid-corner"));

  // 欄標題
  for (let c = 1; c <= cols; c++) {
    const colLabel = createElement("div", "grid-col-label");
    colLabel.textContent = c;
    wrapper.appendChild(colLabel);
  }

  // 列標題 + 格子
  for (let r = 1; r <= rows; r++) {
    const rowLabel = createElement("div", "grid-row-label");
    rowLabel.textContent = r;
    wrapper.appendChild(rowLabel);

    for (let c = 1; c <= cols; c++) {
      const cellIndex = (r - 1) * cols + (c - 1); // 0-based
      const cell = cells[cellIndex];

      const cellEl = createElement("div", "grid-cell");

      if (cell && cell.value != null) {
        cellEl.textContent = cell.value;
        cellEl.classList.add("grid-cell--revealed");
      }

      if (showIndex) {
        const idxEl = createElement("div", "grid-cell-index");
        idxEl.textContent = cellIndex + 1; // 顯示 1-based
        cellEl.appendChild(idxEl);
      }

      cellEl.onclick = () => {
        openNumberPadForCell(cellIndex);
      };

      wrapper.appendChild(cellEl);
    }
  }

  gridEl.appendChild(wrapper);
}
