import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initGrid() {
  const root = $("#grid-root");
  if (!root) return;

  // 初次繪製 + 之後狀態變動時重新渲染
  const render = (state) => {
    const { cols, rows, cells } = state;
    root.innerHTML = "";
  
    const wrapper = createElement("div", "grid-wrapper");
  
    // 空白左上角
    wrapper.appendChild(createElement("div"));
  
    // 欄序
    for (let c = 1; c <= cols; c++) {
      wrapper.appendChild(createElement("div", "grid-col-label", c));
    }
  
    // 每列 + cell
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
  
        cellEl.addEventListener("click", () => {
          const existing = cell.value ?? "";
          const input = prompt("輸入號碼（留空清除）", existing);
          if (input === null) return;
  
          const trimmed = input.trim();
          if (trimmed === "") {
            store.setCellValue(index, null);
            return;
          }
  
          const num = Number(trimmed);
          if (!Number.isInteger(num) || num <= 0) {
            alert("請輸入正整數");
            return;
          }
  
          store.setCellValue(index, num);
        });
  
        wrapper.appendChild(cellEl);
      }
    }
  
    root.appendChild(wrapper);
  };

  // 初次渲染
  render(store.getState());
  // 訂閱後續更新
  store.subscribe(render);
}



