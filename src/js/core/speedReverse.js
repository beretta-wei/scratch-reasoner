import { generatePermutationFromSpeed } from "./speedEngine.js";

// 執行逆推 Speed：針對指定範圍的 speed，尋找符合「已翻開格子」的排列，並計算大獎 / 小獎位置
export function runSpeedReverse(params) {
  const {
    cols,
    rows,
    revealedCells,
    luckyNumbers,
    speedStart,
    speedEnd
  } = params;

  const total = cols * rows;
  const start = Number.isInteger(speedStart) ? speedStart : 0;
  const end = Number.isInteger(speedEnd) ? speedEnd : start;

  const majors = (luckyNumbers && Array.isArray(luckyNumbers.major)) ? luckyNumbers.major : [];
  const minors = (luckyNumbers && Array.isArray(luckyNumbers.minor)) ? luckyNumbers.minor : [];

  const candidates = [];
  let scannedCount = 0;

  for (let s = start; s <= end; s++) {
    scannedCount++;

    const grid = generatePermutationFromSpeed(s, cols, rows);

    let ok = true;
    for (let i = 0; i < revealedCells.length; i++) {
      const cell = revealedCells[i];
      const idx = cell.index;
      const v = cell.value;
      if (idx < 0 || idx >= total) continue;
      if (grid[idx] !== v) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    const majorPositions = [];
    const minorPositions = [];

    if (majors.length > 0) {
      majors.forEach((num) => {
        for (let idx = 0; idx < total; idx++) {
          if (grid[idx] === num) {
            const col = (idx % cols) + 1;
            const row = Math.floor(idx / cols) + 1;
            majorPositions.push({ num, col, row });
          }
        }
      });
    }

    if (minors.length > 0) {
      minors.forEach((num) => {
        for (let idx = 0; idx < total; idx++) {
          if (grid[idx] === num) {
            const col = (idx % cols) + 1;
            const row = Math.floor(idx / cols) + 1;
            minorPositions.push({ num, col, row });
          }
        }
      });
    }

    candidates.push({
      speed: s,
      majorPositions,
      minorPositions
    });
  }

  candidates.sort((a, b) => a.speed - b.speed);

  return {
    scannedCount,
    matchedCount: candidates.length,
    candidates
  };
}
