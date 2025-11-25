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

  // Left-top empty corner
  wrapper.appendChild(createElement("div", "grid-corner"));

  // Column labels
  for (let c = 1; c <= cols; c++) {
    const colLabel = createElement("div", "grid-col-label");
    colLabel.textContent = c;
    wrapper.appendChild(colLabel);
  }

  // Rows + cells
  for (let r = 1; r <= rows; r++) {
    const rowLabel = createElement("div", "grid-row-label");
    rowLabel.textContent = r;
    wrapper.appendChild(rowLabel);

    for (let c = 1; c <= cols; c++) {
      const index = (r - 1) * cols + c;
      const cell = cells[index - 1];

      const cellEl = createElement("div", "grid-cell");

      // Show value
      if (cell.value != null) {
        cellEl.textContent = cell.value;
        cellEl.classList.add("grid-cell--revealed");
      }

      // ✅ Index overlay (右上角顯示)
      if (showIndex) {
        const idxEl = createElement("div", "grid-cell-index");
        idxEl.textContent = index;
        cellEl.appendChild(idxEl);
      }

      // 禁止輸入直到指定 Log（之後套用）

      cellEl.onclick = () => {
        openNumberPadForCell(index - 1);
      };

      wrapper.appendChild(cellEl);
    }
  }

  gridEl.appendChild(wrapper);
}
