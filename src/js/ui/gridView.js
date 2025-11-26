import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";
import { openNumberPadForCell } from "./numberPadView.js";
import { getLogState } from "../core/logStore.js";

export function initGrid() {
  const root = $("#grid-root");

  const render = () => {
    const { cols, rows, cells } = store.getState();
    root.innerHTML = "";

    const wrapper = createElement("div", "grid-wrapper");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = "auto repeat(" + String(cols) + ", var(--cell-size))";
    wrapper.style.gridTemplateRows = "auto repeat(" + String(rows) + ", var(--cell-size))";
    wrapper.style.gap = "4px";

    // 左上角空白
    wrapper.appendChild(createElement("div"));

    // 欄序
    for (let c = 1; c <= cols; c++) {
      wrapper.appendChild(createElement("div", "grid-col-label", c));
    }

    // 列序 + cells
    for (let r = 0; r < rows; r++) {
      wrapper.appendChild(createElement("div", "grid-row-label", r + 1));

      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const cell = cells[index];

        const cellEl = createElement("div", "grid-cell");
        if (cell.revealed) {
          cellEl.classList.add("grid-cell--revealed");
          cellEl.textContent = cell.value;
        }

        cellEl.onclick = () => {
          const { activeLogId } = getLogState();
          if (!activeLogId) {
            window.alert("請先選擇或建立 Log 再輸入格子。");
            return;
          }
          openNumberPadForCell(index);
        };

        wrapper.appendChild(cellEl);
      }
    }

    root.appendChild(wrapper);
  };

  render();
  store.subscribe(render);
}
