import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initGrid() {
  const root = $("#grid-root");
  if (!root) return;

  // 初次繪製 + 之後狀態變動時重新渲染
  const render = (state) => {
    const { cols, rows, cells } = state;
    root.innerHTML = "";
  
    // 建立外層 2D Grid（多一行多一列用來放序號）
    const wrapper = createElement("div");
    wrapper.style.display = "grid";
    wrapper.style.gridTemplateColumns = `auto repeat(${cols}, var(--cell-size))`;
    wrapper.style.gridTemplateRows = `auto repeat(${rows}, var(--cell-size))`;
    wrapper.style.gap = "4px";
  
    // 左上角佔位空白（避免 row/col 標籤重疊）
    wrapper.appendChild(createElement("div"));
  
    // 欄序 Column Labels（1,2,3,4,5...）
    for (let c = 1; c <= cols; c++) {
      const label = createElement("div", "grid-col-label", c);
      wrapper.appendChild(label);
    }
  
    // 每一列 Row + Cell
    for (let r = 0; r < rows; r++) {
      // Row Label（1,2,3,4,...）
      const label = createElement("div", "grid-row-label", r + 1);
      wrapper.appendChild(label);
  
      for (let c = 0; c < cols; c++) {
        const index = r * cols + c;
        const cell = cells[index];
  
        const cellEl = createElement("div", "grid-cell");
        if (cell.revealed) {
          cellEl.classList.add("grid-cell--revealed");
          cellEl.textContent = cell.value;
        }
  
        cellEl.addEventListener("click", () => {
          const current = store.getState().cells[index];
          const existing = current.value ?? "";
  
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

