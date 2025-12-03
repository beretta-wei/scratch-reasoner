// 世界模型 v1：單純依據盤面結構（列 / 行位置）建立先驗勝率分佈
// 不依賴 Speed 或實際 log，只用人類常見的排版偏好作為初始模型。

const WORLD_MODEL_CACHE = new Map();

/**
 * 建立世界模型 v1
 * 目前的假設：
 *  - 越靠右、越靠下，權重略高
 *  - 靠近盤面中心的權重略高
 *  - 只使用盤面尺寸 (cols, rows)，不看實際號碼
 */
function buildWorldModel(cols, rows) {
  const total = cols * rows;
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || total <= 0) {
    return null;
  }

  const cellWeights = new Array(total).fill(0);

  const centerRow = (rows - 1) / 2;
  const centerCol = (cols - 1) / 2;

  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    // 底部 / 右側略高
    const rowRatio = (r + 1) / rows;  // 0..1（越下越大）
    const colRatio = (c + 1) / cols;  // 0..1（越右越大）

    // 靠近中心略高
    const dr = (r - centerRow) / rows;
    const dc = (c - centerCol) / cols;
    const dist = Math.sqrt(dr * dr + dc * dc); // 0 ~ 約 0.7
    let centerScore = 1 - dist; // 中心 ~1，角落 ~0.x
    if (centerScore < 0) centerScore = 0;

    // 權重組合（可以未來再調整比例）
    const w =
      0.4 * rowRatio +
      0.4 * colRatio +
      0.2 * centerScore;

    cellWeights[idx] = w;
  }

  // 正規化到 0..1
  let min = Infinity;
  let max = -Infinity;
  for (let w of cellWeights) {
    if (w < min) min = w;
    if (w > max) max = w;
  }
  if (max > min) {
    for (let i = 0; i < cellWeights.length; i++) {
      cellWeights[i] = (cellWeights[i] - min) / (max - min);
    }
  } else {
    // 理論上不會發生，全部設成中間值
    for (let i = 0; i < cellWeights.length; i++) {
      cellWeights[i] = 0.5;
    }
  }

  return {
    cols,
    rows,
    totalCells: total,
    cellWeights
  };
}

/**
 * 取得指定尺寸的世界模型（具備快取）
 */
export function getWorldModel(cols, rows) {
  const key = `${cols}x${rows}`;
  if (WORLD_MODEL_CACHE.has(key)) {
    return WORLD_MODEL_CACHE.get(key);
  }
  const model = buildWorldModel(cols, rows);
  if (model) {
    WORLD_MODEL_CACHE.set(key, model);
  }
  return model;
}

/**
 * 依據世界模型與目前盤面狀態，推薦下一個要刮的格子
 * - 只會從「尚未翻開」的格子中挑選
 * - 回傳 { index, col, row, score } 或 null
 */
export function pickNextCellByWorldModel(model, cells) {
  if (!model || !Array.isArray(cells) || cells.length === 0) {
    return null;
  }
  const { cols, cellWeights } = model;
  let bestIdx = null;
  let bestScore = -Infinity;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell && cell.revealed) continue;
    const w = cellWeights[i] ?? 0;
    if (w > bestScore) {
      bestScore = w;
      bestIdx = i;
    }
  }

  if (bestIdx == null) return null;

  const col = (bestIdx % cols) + 1;
  const row = Math.floor(bestIdx / cols) + 1;

  return {
    index: bestIdx,
    col,
    row,
    score: bestScore
  };
}

/**
 * 將 cellWeights 轉成排序好的推薦列表（不考慮 revealed）
 * 主要用在 UI 顯示 TOP N
 */
export function buildRankedCells(model) {
  if (!model) return [];
  const { cols, rows, cellWeights } = model;
  const total = cols * rows;
  const list = [];
  for (let idx = 0; idx < total; idx++) {
    const col = (idx % cols) + 1;
    const row = Math.floor(idx / cols) + 1;
    const score = cellWeights[idx] ?? 0;
    list.push({ index: idx, col, row, score });
  }
  list.sort((a, b) => b.score - a.score);
  return list;
}
