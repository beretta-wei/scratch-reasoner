import { store } from "../core/state.js";
import { createElement } from "../utils/dom.js";

let overlayEl = null;
let sheetEl = null;
let gridEl = null;
let clearBtn = null;
let cancelBtn = null;
let currentCellIndex = null;
let bodyOriginalOverflow = "";

/**
 * 建立底部數字選擇面板
 */
export function initNumberPad() {
  if (overlayEl) return; // 已初始化

  overlayEl = document.createElement("div");
  overlayEl.className = "number-pad-overlay";

  sheetEl = document.createElement("div");
  sheetEl.className = "number-pad-sheet";

  const header = document.createElement("div");
  header.className = "number-pad-header";
  const title = document.createElement("span");
  title.textContent = "選擇號碼";
  header.appendChild(title);

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "number-pad-close";
  closeBtn.textContent = "✕";
  closeBtn.addEventListener("click", () => {
    closeNumberPad();
  });
  header.appendChild(closeBtn);

  gridEl = document.createElement("div");
  gridEl.className = "number-pad-grid";

  const actions = document.createElement("div");
  actions.className = "number-pad-actions";

  clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn btn-ghost";
  clearBtn.textContent = "清除此格";
  clearBtn.addEventListener("click", () => {
    if (currentCellIndex == null) return;
    store.setCellValue(currentCellIndex, null);
    closeNumberPad();
  });

  cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn";
  cancelBtn.textContent = "取消";
  cancelBtn.addEventListener("click", () => {
    closeNumberPad();
  });

  actions.appendChild(clearBtn);
  actions.appendChild(cancelBtn);

  sheetEl.appendChild(header);
  sheetEl.appendChild(gridEl);
  sheetEl.appendChild(actions);

  overlayEl.appendChild(sheetEl);

  // 點擊背景關閉（避免點到面板本體）
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) {
      closeNumberPad();
    }
  });

  document.body.appendChild(overlayEl);
}

function renderNumberButtons() {
  if (!gridEl) return;
  const state = store.getState();
  const { cells } = state;
  const total = cells.length;

  gridEl.innerHTML = "";

  const currentCell = currentCellIndex != null ? cells[currentCellIndex] : null;
  const currentValue = currentCell ? currentCell.value : null;

  // 從目前所有格子中計算已使用的號碼（除了當前這格原本的值）
  const usedSet = new Set();
  for (const cell of cells) {
    if (cell.value == null) continue;
    if (currentValue != null && cell.index === currentCellIndex) continue;
    usedSet.add(cell.value);
  }

  for (let n = 1; n <= total; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = String(n);
    btn.className = "number-pad-number";

    if (currentValue === n) {
      btn.classList.add("number-pad-number--current");
    }

    if (usedSet.has(n)) {
      btn.classList.add("number-pad-number--used");
      btn.disabled = true;
    } else {
      btn.addEventListener("click", () => {
        if (currentCellIndex == null) return;
        store.setCellValue(currentCellIndex, n);
        closeNumberPad();
      });
    }

    gridEl.appendChild(btn);
  }
}

export function openNumberPadForCell(index) {
  if (!overlayEl) {
    initNumberPad();
  }
  currentCellIndex = index;
  renderNumberButtons();

  bodyOriginalOverflow = document.body.style.overflow || "";
  document.body.style.overflow = "hidden";

  overlayEl.classList.add("number-pad-overlay--open");
}

export function closeNumberPad() {
  if (!overlayEl) return;
  overlayEl.classList.remove("number-pad-overlay--open");
  document.body.style.overflow = bodyOriginalOverflow;
  currentCellIndex = null;
}
