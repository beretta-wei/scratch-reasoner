import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initGrid() {
  const root = $("#grid-root");

  const render = () => {
    const { cols, rows, cells, showIndex } = store.getState();
    root.innerHTML = "";

    const wrapper = createElement("div", "grid-wrapper");

    // 左上角空白
    wrapper.appendChild(createElement("div"));

    // 欄序
    for (let c = 1; c <= cols; c++) {
      wrapper.appendChild(createElement("div", "grid-col-label", c));
    }

    // 列序 + cells
    for (let r = 0; r < rows; r++) {
      // 列標
      wrapper.appendChild(createElement("div", "grid-row-label", r + 1));

      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const cell = cells[index];

        const cellEl = createElement("div", "grid-cell");
        if (cell && cell.revealed) {
          cellEl.classList.add("grid-cell--revealed");
          cellEl.textContent = cell.value;
        }

        cellEl.onclick = () => {
          const input = prompt("輸入（留空清除）", cell && cell.value != null ? String(cell.value) : "");
          if (input === null) return;
          const trimmed = input.trim();
          store.setCellValue(index, trimmed === "" ? null : Number(trimmed));
        };

        if (showIndex) {
          const idxEl = createElement("div", "grid-cell-index");
          idxEl.textContent = index + 1; // 1-based 顯示
          cellEl.appendChild(idxEl);
        }

        wrapper.appendChild(cellEl);
      }
    }

    root.appendChild(wrapper);
  };

  render();
  store.subscribe(render);
}
