import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

export function initGrid() {
  const root = $("#grid-root");
  if (!root) return;

  // 初次繪製 + 之後狀態變動時重新渲染
  const render = (state) => {
    const { cols, cells } = state;
    root.innerHTML = "";
    root.style.gridTemplateColumns = `repeat(${cols}, var(--cell-size))`;

    cells.forEach((cell, index) => {
      const cellEl = createElement("div", "grid-cell");
      if (cell.revealed) {
        cellEl.classList.add("grid-cell--revealed");
        cellEl.textContent = cell.value;
      } else {
        cellEl.textContent = ""; // 可改成顯示 id 或留空，之後再調整
      }

      cellEl.addEventListener("click", () => {
        const current = store.getState().cells[index];
        const existing = current.value ?? "";

        const input = prompt("輸入已刮出的號碼（留空代表清除）", existing);
        if (input === null) {
          // 使用者取消
          return;
        }

        const trimmed = input.trim();
        if (trimmed === "") {
          store.setCellValue(index, null);
          return;
        }

        const num = Number(trimmed);
        if (!Number.isInteger(num) || num <= 0) {
          alert("請輸入正整數。");
          return;
        }

        // 目前先不限制 1~120，之後推理規則清楚後再一起處理
        store.setCellValue(index, num);
      });

      root.appendChild(cellEl);
    });
  };

  // 初次渲染
  render(store.getState());
  // 訂閱後續更新
  store.subscribe(render);
}
