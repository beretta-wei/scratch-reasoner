import { store } from "../core/state.js";

let overlayEl = null;
let sheetEl = null;
let gridEl = null;
let clearBtn = null;
let cancelBtn = null;
let currentCellIndex = null;
let bodyOriginalOverflow = "";

/**
 * 初始化底部數字選擇面板（只建立一次）
 */
export function initNumberPad() {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.className = "number-pad-overlay";

  sheetEl = document.createElement("div");
  sheetEl.className = "number-pad-sheet";

  // Header
  const header = document.createElement("div");
  header.className = "number-pad-header";

  const title = document.createElement("div");
  title.className = "number-pad-title";
  title.textContent = "選擇號碼";

  const subtitle = document.createElement("div");
  subtitle.className = "number-pad-subtitle";
  subtitle.textContent = "已使用的號碼將會被停用";

  header.appendChild(title);
  header.appendChild(subtitle);

  // Grid 區
  gridEl = document.createElement("div");
  gridEl.className = "number-pad-grid";

  // 按鈕區
  const actions = document.createElement("div");
  actions.className = "number-pad-actions";

  clearBtn = document.createElement("button");
  clearBtn.type = "button";
  clearBtn.className = "btn number-pad-btn-clear";
  clearBtn.textContent = "清除此格";

  cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "btn number-pad-btn-cancel";
  cancelBtn.textContent = "取消";

  actions.appendChild(clearBtn);
  actions.appendChild(cancelBtn);

  sheetEl.appendChild(header);
  sheetEl.appendChild(gridEl);
  sheetEl.appendChild(actions);
  overlayEl.appendChild(sheetEl);
  document.body.appendChild(overlayEl);

  // 事件
  overlayEl.addEventListener("click", (e) => {
    if (e.target === overlayEl) {
      closeNumberPad();
    }
  });

  clearBtn.onclick = () => {
    if (currentCellIndex == null) return;
    store.setCellValue(currentCellIndex, null);
    closeNumberPad();
  };

  cancelBtn.onclick = () => {
    closeNumberPad();
  };
}

function renderNumberButtons() {
  if (!gridEl) return;
  const { cells } = store.getState();
  const total = cells.length;

  gridEl.innerHTML = "";

  let currentValue = null;
  if (currentCellIndex != null && cells[currentCellIndex]) {
    currentValue = cells[currentCellIndex].value;
  }

  const used = new Set();
  cells.forEach((cell, idx) => {
    if (cell.value != null && idx !== currentCellIndex) {
      used.add(cell.value);
    }
  });

  for (let n = 1; n <= total; n++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "number-pad-number";
    btn.textContent = String(n);

    if (used.has(n)) {
      btn.classList.add("number-pad-number--used");
      btn.disabled = true;
    }

    if (currentValue === n) {
      btn.classList.add("number-pad-number--current");
    }

    btn.onclick = () => {
      if (currentCellIndex == null) return;
      store.setCellValue(currentCellIndex, n);
      closeNumberPad();
    };

    gridEl.appendChild(btn);
  }
}

export function openNumberPadForCell(index) {
  initNumberPad();

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
