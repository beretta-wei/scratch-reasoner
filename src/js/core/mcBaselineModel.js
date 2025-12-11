
import { store } from "./state.js";

/**
 * Monte Carlo baseline model
 * 針對單一大獎號 bigNumber，在 8 個起點 / 方向下進行多次模擬：
 * - 每次建立 1..(rows*cols) 的亂數排列（Fisher–Yates 洗牌）
 * - 依該方向的掃描順序，找到 bigNumber 出現的格子
 * - 對該格計數 +1
 *
 * 回傳：
 * - hitCount[row][col]：命中次數
 * - probabilities[row][col]：機率（0~1）
 */
function createDirectionPaths(rows, cols) {
  const paths = [];

  // 1. 左上角，橫→下
  (function () {
    const path = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 2. 左上角，縱→右
  (function () {
    const path = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 3. 右上角，橫←下
  (function () {
    const path = [];
    for (let r = 0; r < rows; r++) {
      for (let c = cols - 1; c >= 0; c--) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 4. 右上角，縱↓左
  (function () {
    const path = [];
    for (let c = cols - 1; c >= 0; c--) {
      for (let r = 0; r < rows; r++) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 5. 左下角，橫→上
  (function () {
    const path = [];
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = 0; c < cols; c++) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 6. 左下角，縱↑右
  (function () {
    const path = [];
    for (let c = 0; c < cols; c++) {
      for (let r = rows - 1; r >= 0; r--) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 7. 右下角，橫←上
  (function () {
    const path = [];
    for (let r = rows - 1; r >= 0; r--) {
      for (let c = cols - 1; c >= 0; c--) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  // 8. 右下角，縱↑左
  (function () {
    const path = [];
    for (let c = cols - 1; c >= 0; c--) {
      for (let r = rows - 1; r >= 0; r--) {
        path.push({ r, c });
      }
    }
    paths.push(path);
  })();

  return paths;
}

function fisherYatesShuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * 執行 Monte Carlo baseline 模擬
 *
 * @param {Object} options
 * @param {number} options.rows - 列數
 * @param {number} options.cols - 欄數
 * @param {number} options.bigNumber - 目標大獎號碼（1..rows*cols）
 * @param {number} options.runsPerDirection - 每個方向模擬次數
 * @returns {{ hitCount: number[][], probabilities: number[][], totalRuns: number }}
 */

export function runMonteCarloBaseline(options) {
  const state = store.getState();
  const rows = options?.rows ?? state.rows;
  const cols = options?.cols ?? state.cols;
  const bigNumber = options.bigNumber;
  const runsPerDirection = options.runsPerDirection ?? 1000;

  const totalCells = rows * cols;

  if (!Number.isInteger(bigNumber) || bigNumber < 1 || bigNumber > totalCells) {
    throw new Error(`bigNumber 必須介於 1 與 ${totalCells} 之間`);
  }

  const paths = createDirectionPaths(rows, cols);
  const dirCount = paths.length;

  const hitCount = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  // Monte Carlo：在 8 個方向下，對 bigNumber 進行基準模擬
  for (let d = 0; d < dirCount; d++) {
    const path = paths[d];

    for (let run = 0; run < runsPerDirection; run++) {
      const nums = new Array(totalCells);
      for (let i = 0; i < totalCells; i++) {
        nums[i] = i + 1;
      }
      fisherYatesShuffle(nums);

      const idx = nums.indexOf(bigNumber);
      if (idx === -1) {
        continue;
      }

      const pos = path[idx];
      if (pos) {
        hitCount[pos.r][pos.c] += 1;
      }
    }
  }

  const totalRuns = runsPerDirection * dirCount;

  // 原始機率（未考慮已刮格子）
  const baseProbabilities = hitCount.map((row) =>
    row.map((cnt) => (totalRuns > 0 ? cnt / totalRuns : 0))
  );

  // 依照「目前盤面」調整：
  // - 已刮格子（revealed = true）機率強制 0
  // - 剩餘格子重新正規化，總和 = 1
  const cells = state.cells || [];
  const normProbabilities = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => 0)
  );

  let sumRemaining = 0;
  const baseEffective = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      const cell = cells[idx];
      const revealed = cell ? !!cell.revealed : false;
      const baseP = baseProbabilities[r][c];

      const effectiveP = revealed ? 0 : baseP;
      baseEffective.push({ r, c, p: effectiveP, revealed });

      if (!revealed) {
        sumRemaining += effectiveP;
      }
    }
  }

  // 正規化：讓所有「未刮」格子的機率總和 = 1
  const rankedCells = [];
  if (sumRemaining > 0) {
    for (const item of baseEffective) {
      const { r, c, p, revealed } = item;
      if (!revealed && p > 0) {
        const normalized = p / sumRemaining;
        normProbabilities[r][c] = normalized;
        rankedCells.push({ r, c, p: normalized });
      } else {
        normProbabilities[r][c] = 0;
      }
    }
  }

  // 依照機率由大到小排序（只保留未刮且機率 > 0 的格子）
  rankedCells.sort((a, b) => b.p - a.p);

  return {
    hitCount,
    baseProbabilities,
    normProbabilities,
    rankedCells,
    totalRuns,
  };
}

