
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
  const probabilities = hitCount.map((row) =>
    row.map((cnt) => (totalRuns > 0 ? cnt / totalRuns : 0))
  );

  return {
    hitCount,
    probabilities,
    totalRuns,
  };
}
