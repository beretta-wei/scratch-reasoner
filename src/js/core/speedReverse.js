import { generatePermutationFromSpeed } from "./speedEngine.js";

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

  const candidates = [];
  let scannedCount = 0;

  const majors = (luckyNumbers && Array.isArray(luckyNumbers.major)) ? luckyNumbers.major : [];
  const minors = (luckyNumbers && Array.isArray(luckyNumbers.minor)) ? luckyNumbers.minor : [];

  for (let s = start; s <= end; s++) {
    scannedCount++;
    const grid = generatePermutationFromSpeed(s, total);

    // 早期中斷：只要有一格不符合就跳下一個 speed
    let ok = true;
    for (let i = 0; i < revealedCells.length; i++) {
      const cell = revealedCells[i];
      const idx = cell.index;
      const v = cell.value;
      if (idx < 0 || idx >= total) {
        continue;
      }
      if (grid[idx] !== v) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;

    // 計算此 speed 下 lucky numbers 的位置
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

  return {
    scannedCount,
    matchedCount: candidates.length,
    candidates
  };
}
