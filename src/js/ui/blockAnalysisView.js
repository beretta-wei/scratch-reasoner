import { store } from "../core/state.js";
import { $, createElement } from "../utils/dom.js";

const DEFAULT_BLOCK_COLS = 4;
const DEFAULT_BLOCK_ROWS = 4;

function normalizeBlockSize(value, max) {
  let next = Number.parseInt(value, 10);
  if (!Number.isFinite(next) || next <= 0) next = 1;
  if (Number.isFinite(max)) {
    next = Math.min(next, max);
  }
  return next;
}

function buildBlockStats({ cols, rows, cells, blockCols, blockRows }) {
  // 依 blockCols/blockRows 切割盤面，邊界不足完整區塊仍納入計算。
  const blockColumnCount = Math.ceil(cols / blockCols);
  const blockRowCount = Math.ceil(rows / blockRows);
  const blocks = [];

  for (let br = 0; br < blockRowCount; br += 1) {
    for (let bc = 0; bc < blockColumnCount; bc += 1) {
      const startRow = br * blockRows;
      const endRow = Math.min(startRow + blockRows, rows);
      const startCol = bc * blockCols;
      const endCol = Math.min(startCol + blockCols, cols);
      const total = (endRow - startRow) * (endCol - startCol);

      let opened = 0;
      for (let r = startRow; r < endRow; r += 1) {
        for (let c = startCol; c < endCol; c += 1) {
          const index = r * cols + c;
          if (cells[index] && cells[index].revealed) {
            opened += 1;
          }
        }
      }

      blocks.push({ opened, total });
    }
  }

  return {
    blocks,
    blockColumnCount,
    blockRowCount
  };
}

export function initBlockAnalysis() {
  const root = $("#tab-block-analysis");
  if (!root) return;

  root.innerHTML = "";

  const title = createElement("div", "stats-section-title", "區塊分析");
  const container = createElement("div", "block-analysis-root");

  const controls = createElement("div", "block-analysis-controls");
  const colsField = createElement("label", "block-analysis-field");
  const colsLabel = createElement("span", "control-label", "每區塊欄數");
  const colsInput = createElement("input", "block-analysis-input");
  colsInput.type = "number";
  colsInput.min = "1";
  colsInput.step = "1";

  const rowsField = createElement("label", "block-analysis-field");
  const rowsLabel = createElement("span", "control-label", "每區塊列數");
  const rowsInput = createElement("input", "block-analysis-input");
  rowsInput.type = "number";
  rowsInput.min = "1";
  rowsInput.step = "1";

  colsField.appendChild(colsLabel);
  colsField.appendChild(colsInput);
  rowsField.appendChild(rowsLabel);
  rowsField.appendChild(rowsInput);
  controls.appendChild(colsField);
  controls.appendChild(rowsField);

  const grid = createElement("div", "block-analysis-grid");

  container.appendChild(controls);
  container.appendChild(grid);
  root.appendChild(title);
  root.appendChild(container);

  const state = {
    blockCols: DEFAULT_BLOCK_COLS,
    blockRows: DEFAULT_BLOCK_ROWS
  };

  const render = () => {
    const { cols, rows, cells } = store.getState();
    if (!cols || !rows || !Array.isArray(cells)) {
      grid.innerHTML = "";
      grid.appendChild(createElement("div", "stats-placeholder", "目前沒有盤面資料。"));
      return;
    }

    const maxCols = Math.max(1, cols);
    const maxRows = Math.max(1, rows);

    state.blockCols = normalizeBlockSize(state.blockCols, maxCols);
    state.blockRows = normalizeBlockSize(state.blockRows, maxRows);

    colsInput.max = String(maxCols);
    rowsInput.max = String(maxRows);
    colsInput.value = String(state.blockCols);
    rowsInput.value = String(state.blockRows);

    const { blocks, blockColumnCount, blockRowCount } = buildBlockStats({
      cols,
      rows,
      cells,
      blockCols: state.blockCols,
      blockRows: state.blockRows
    });

    grid.innerHTML = "";
    if (blocks.length === 0) {
      grid.appendChild(createElement("div", "stats-placeholder", "目前沒有區塊可顯示。"));
      return;
    }

    // 依左到右、上到下建立區塊資訊。
    blocks.forEach((block, index) => {
      const card = createElement("div", "block-analysis-card");
      const blockNumber = index + 1;
      const label = createElement(
        "div",
        "block-analysis-card-title",
        `區塊 ${blockNumber}`
      );
      const count = createElement(
        "div",
        "block-analysis-card-value",
        `${block.opened} / ${block.total}`
      );

      card.appendChild(label);
      card.appendChild(count);
      grid.appendChild(card);
    });

    grid.style.gridTemplateColumns = `repeat(${blockColumnCount}, minmax(120px, 1fr))`;
    grid.style.gridTemplateRows = `repeat(${blockRowCount}, auto)`;
  };

  colsInput.addEventListener("change", () => {
    state.blockCols = normalizeBlockSize(colsInput.value, store.getState().cols);
    render();
  });

  rowsInput.addEventListener("change", () => {
    state.blockRows = normalizeBlockSize(rowsInput.value, store.getState().rows);
    render();
  });

  render();
  store.subscribe(render);
}
