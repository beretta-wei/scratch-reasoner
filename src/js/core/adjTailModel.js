import { store } from "./state.js";

/**
 * Adjacent tail analysis model
 *
 * 核心觀念：
 * - 針對每一個已知數值的格子（起點），計算它在 8 個方向、不同距離 d 上
 *   對其它已知格子的「尾數轉移關係」。
 * - 對於每一條實際發生的轉移：
 *     fromTail --(dir, d)--> targetTail
 *   我們在該方向紀錄 score += 1，並在同距離的其它 7 個方向紀錄 score += 0.1，
 *   這樣既保留「最佳方向」的優勢，又不把其它方向視為 0 機率。
 *
 * 結果存在 adjTailStats：
 *   adjTailStats[targetTail][fromTail][dirId][distance] = {
 *     hit: 實際發生次數（只有實際方向才會 +1），
 *     score: 加權後的評分（實際方向 +1，其它方向 +0.1 疊加）
 *   }
 */

const DIRECTIONS = [
  { id: "R", dx: 1, dy: 0, label: "右" },
  { id: "L", dx: -1, dy: 0, label: "左" },
  { id: "D", dx: 0, dy: 1, label: "下" },
  { id: "U", dx: 0, dy: -1, label: "上" },
  { id: "DR", dx: 1, dy: 1, label: "右下" },
  { id: "DL", dx: -1, dy: 1, label: "左下" },
  { id: "UR", dx: 1, dy: -1, label: "右上" },
  { id: "UL", dx: -1, dy: -1, label: "左上" }
];

let adjTailStats = createEmptyStats();

/**
 * 建立空的統計結構：
 * - 目標尾號 targetTail: 0~9
 * - 其餘層級在實際使用時動態建立
 */
function createEmptyStats() {
  const stats = new Array(10);
  for (let t = 0; t < 10; t++) {
    stats[t] = Object.create(null); // fromTail -> dirId -> distance -> record
  }
  return stats;
}

function ensureRecord(stats, targetTail, fromTail, dirId, distance) {
  const t = stats[targetTail] || (stats[targetTail] = Object.create(null));
  const fromMap = t[fromTail] || (t[fromTail] = Object.create(null));
  const dirMap = fromMap[dirId] || (fromMap[dirId] = Object.create(null));
  let rec = dirMap[distance];
  if (!rec) {
    rec = { hit: 0, score: 0 };
    dirMap[distance] = rec;
  }
  return rec;
}

/**
 * 從目前 store 的 state 重新計算整份 adjTailStats。
 * 只根據「已揭露且為數值」的格子。
 */
export function recomputeAdjTailStatsFromState() {
  const { rows, cols, cells } = store.getState();
  if (!rows || !cols || !Array.isArray(cells)) {
    adjTailStats = createEmptyStats();
    return;
  }

  const stats = createEmptyStats();

  const total = cells.length;
  for (let index = 0; index < total; index++) {
    const cell = cells[index];
    if (!cell || !cell.revealed) continue;

    const value = typeof cell.value === "number" ? cell.value : Number(cell.value);
    if (!Number.isFinite(value)) continue;

    const fromTail = Math.abs(value) % 10;
    const row = Math.floor(index / cols);
    const col = index % cols;

    for (const dir of DIRECTIONS) {
      let dist = 0;
      while (true) {
        dist += 1;
        const r2 = row + dir.dy * dist;
        const c2 = col + dir.dx * dist;
        if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) break;

        const idx2 = r2 * cols + c2;
        const cell2 = cells[idx2];
        if (!cell2 || !cell2.revealed) continue;

        const v2 = typeof cell2.value === "number" ? cell2.value : Number(cell2.value);
        if (!Number.isFinite(v2)) continue;

        const targetTail = Math.abs(v2) % 10;

        // 實際發生的方向：+1 hit, +1 score
        const rec = ensureRecord(stats, targetTail, fromTail, dir.id, dist);
        rec.hit += 1;
        rec.score += 1;

        // 其它方向：只做平滑分數 +0.25，不增加 hit
        for (const other of DIRECTIONS) {
          if (other.id === dir.id) continue;
          const recOther = ensureRecord(stats, targetTail, fromTail, other.id, dist);
          recOther.score += 0.1;
        }
      }
    }
  }

  adjTailStats = stats;
}

/**
 * 取得整份統計結果（給進階使用或除錯用）。
 */
export function getAdjTailStats() {
  return adjTailStats;
}

/**
 * 以「目標尾號」為主，整理成適合表格顯示的列資料。
 * 回傳陣列，每一筆包含：
 * { targetTail, fromTail, dirId, distance, hit, score }
 */
export function getAdjTailRowsForTarget(targetTail) {
  const t = adjTailStats[targetTail];
  const rows = [];
  if (!t) return rows;

  for (const fromTailStr of Object.keys(t)) {
    const fromTail = Number(fromTailStr);
    const dirMapAll = t[fromTail];
    for (const dirId of Object.keys(dirMapAll)) {
      const distMap = dirMapAll[dirId];
      for (const distStr of Object.keys(distMap)) {
        const distance = Number(distStr);
        const rec = distMap[distStr];
        rows.push({
          targetTail,
          fromTail,
          dirId,
          distance,
          hit: rec.hit,
          score: rec.score
        });
      }
    }
  }

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.hit !== a.hit) return b.hit - a.hit;
    if (a.targetTail !== b.targetTail) return a.targetTail - b.targetTail;
    if (a.fromTail !== b.fromTail) return a.fromTail - b.fromTail;
    if (a.distance !== b.distance) return a.distance - b.distance;
    return a.dirId.localeCompare(b.dirId);
  });

  return rows;
}

/**
 * 幫某一格計算「成為目標尾號 targetTail」的信心分數。
 * - 以目前的 adjTailStats 為基礎
 * - 從周遭鄰居（已揭露的格子）收集證據並加總
 */
export function scoreCellForTargetTail(index, targetTail, maxDistance = 4) {
  const { rows, cols, cells } = store.getState();
  if (!rows || !cols || !Array.isArray(cells)) return 0;
  if (index < 0 || index >= cells.length) return 0;

  const row = Math.floor(index / cols);
  const col = index % cols;

  let totalScore = 0;

  for (const dir of DIRECTIONS) {
    for (let dist = 1; dist <= maxDistance; dist++) {
      const r2 = row + dir.dy * dist;
      const c2 = col + dir.dx * dist;
      if (r2 < 0 || r2 >= rows || c2 < 0 || c2 >= cols) break;

      const idx2 = r2 * cols + c2;
      const neighbor = cells[idx2];
      if (!neighbor || !neighbor.revealed) continue;

      const v = typeof neighbor.value === "number" ? neighbor.value : Number(neighbor.value);
      if (!Number.isFinite(v)) continue;

      const fromTail = Math.abs(v) % 10;
      const t = adjTailStats[targetTail];
      if (!t) continue;
      const fromMap = t[fromTail];
      if (!fromMap) continue;
      const dirMap = fromMap[dir.id];
      if (!dirMap) continue;
      const rec = dirMap[dist];
      if (!rec) continue;

      totalScore += rec.score;
    }
  }

  return totalScore;
}

/**
 * 幫所有格子計算「成為目標尾號 targetTail」的分數。
 * 回傳陣列：[{ index, row, col, score }, ...]
 */
export function scoreAllCellsForTargetTail(targetTail, maxDistance = 4) {
  const { rows, cols, cells } = store.getState();
  if (!rows || !cols || !Array.isArray(cells)) return [];

  const results = [];

  for (let index = 0; index < cells.length; index++) {
    const cell = cells[index];
    // 只對「尚未揭露」的格子計分，避免跟已知資訊混在一起
    if (cell && cell.revealed) continue;

    const score = scoreCellForTargetTail(index, targetTail, maxDistance);
    if (score <= 0) continue;

    const row = Math.floor(index / cols);
    const col = index % cols;

    results.push({ index, row, col, score });
  }

  results.sort((a, b) => b.score - a.score);

  return results;
}

/**
 * 初始化：綁定 store 監聽，並在 window 暴露除錯入口。
 */
export function initAdjTailModel() {
  // 初始重算一次
  recomputeAdjTailStatsFromState();

  // 之後只要 state 有變化（含你輸入新數字），就自動重算
  store.subscribe(() => {
    recomputeAdjTailStatsFromState();
  });

  if (typeof window !== "undefined") {
    window.__adjTailModel = {
      getAdjTailStats,
      getAdjTailRowsForTarget,
      scoreCellForTargetTail,
      scoreAllCellsForTargetTail
    };
  }
}
