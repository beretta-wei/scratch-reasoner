// 通用多模型 Speed 產生器（V4）
// 依照 speed 所在區間選擇不同模型，再根據 cols/rows 產生 1..total 的排列

function makeLCG(seed) {
  let x = (Number.isInteger(seed) ? seed : 1) >>> 0;
  if (x === 0) x = 1;
  return function next() {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x;
  };
}

function shuffleArray(arr, next) {
  for (let i = arr.length - 1; i > 0; i--) {
    const r = next();
    const j = r % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

// M1：純亂數洗牌（baseline）
function generateM1(seed, total) {
  const next = makeLCG(seed);
  const arr = Array.from({ length: total }, (_, i) => i + 1);
  return shuffleArray(arr, next);
}

// M2：上下區域分布（小獎上、大獎下的概念）
function generateM2(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);
  const halfRows = Math.floor(rows / 2);

  const lowVals = [];
  const highVals = [];
  for (let v = 1; v <= total; v++) {
    if (v <= total / 2) lowVals.push(v);
    else highVals.push(v);
  }
  shuffleArray(lowVals, next);
  shuffleArray(highVals, next);

  const grid = new Array(total);
  let lowIdx = 0;
  let highIdx = 0;

  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    if (r < halfRows) {
      if (lowIdx < lowVals.length) grid[idx] = lowVals[lowIdx++];
      else grid[idx] = highVals[highIdx++];
    } else {
      if (highIdx < highVals.length) grid[idx] = highVals[highIdx++];
      else grid[idx] = lowVals[lowIdx++];
    }
  }
  return grid;
}

// M3：左右區域分布（小獎左、大獎右的概念）
function generateM3(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);
  const halfCols = Math.floor(cols / 2);

  const lowVals = [];
  const highVals = [];
  for (let v = 1; v <= total; v++) {
    if (v <= total / 2) lowVals.push(v);
    else highVals.push(v);
  }
  shuffleArray(lowVals, next);
  shuffleArray(highVals, next);

  const grid = new Array(total);
  let lowIdx = 0;
  let highIdx = 0;

  for (let idx = 0; idx < total; idx++) {
    const c = idx % cols;
    if (c < halfCols) {
      if (lowIdx < lowVals.length) grid[idx] = lowVals[lowIdx++];
      else grid[idx] = highVals[highIdx++];
    } else {
      if (highIdx < highVals.length) grid[idx] = highVals[highIdx++];
      else grid[idx] = lowVals[lowIdx++];
    }
  }
  return grid;
}

// 助手：計算 block key（九宮格之類）
function getBlockKey(idx, cols, rows, blockW, blockH) {
  const r = Math.floor(idx / cols);
  const c = idx % cols;
  const br = Math.floor(r / blockH);
  const bc = Math.floor(c / blockW);
  const blocksPerRow = Math.ceil(cols / blockW);
  return br * blocksPerRow + bc;
}

// M4：九宮格局部結構（每個 3x3 區塊內先局部洗牌）
function generateM4(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);
  const blockW = 3;
  const blockH = 3;

  // 先準備所有值並洗牌
  const allVals = Array.from({ length: total }, (_, i) => i + 1);
  shuffleArray(allVals, next);

  const remainingM4 = new Set(allVals);


  // 將值平均分配到各 block
  const blockMap = new Map();
  for (let idx = 0; idx < total; idx++) {
    const key = getBlockKey(idx, cols, rows, blockW, blockH);
    if (!blockMap.has(key)) blockMap.set(key, []);
  }
  const blockKeys = Array.from(blockMap.keys());
  let valIndex = 0;
  while (valIndex < allVals.length) {
    for (let i = 0; i < blockKeys.length && valIndex < allVals.length; i++) {
      const k = blockKeys[i];
      blockMap.get(k).push(allVals[valIndex++]);
    }
  }

  // 每個 block 內再洗牌一次
  blockMap.forEach((arr, key) => {
    shuffleArray(arr, next);
  });

  const grid = new Array(total);
  const blockUsed = new Map();
  for (let idx = 0; idx < total; idx++) {
    const key = getBlockKey(idx, cols, rows, blockW, blockH);
    const bucket = blockMap.get(key) || [];
    let used = blockUsed.get(key) || 0;
    if (used >= bucket.length) {
      // 該區用完就從 remainingM4 中取一個尚未使用的數字
      const iter = remainingM4.values();
      const first = iter.next();
      if (!first.done) {
        grid[idx] = first.value;
        remainingM4.delete(first.value);
      } else {
        grid[idx] = 1; // 理論上不會發生，保險處理
      }
    } else {
      const v = bucket[used];
      grid[idx] = v;
      remainingM4.delete(v);
      used += 1;
      blockUsed.set(key, used);
    }
  }

  return grid;
}

// M5：數值範圍 zoning（左上小數字、右下大數字的傾向）
function generateM5(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);

  const vals = Array.from({ length: total }, (_, i) => i + 1);
  shuffleArray(vals, next);

  const remainingM5 = new Set(vals);

  // 將整體切成 4 個區：左上、右上、左下、右下
  const midRow = Math.floor(rows / 2);
  const midCol = Math.floor(cols / 2);

  const quads = {
    tl: [],
    tr: [],
    bl: [],
    br: []
  };

  vals.forEach((v, idx) => {
    // 大致上小的數字傾向 tl/tr，大的傾向 bl/br
    if (v <= total * 0.25) quads.tl.push(v);
    else if (v <= total * 0.5) quads.tr.push(v);
    else if (v <= total * 0.75) quads.bl.push(v);
    else quads.br.push(v);
  });

  const grid = new Array(total);
  const used = { tl: 0, tr: 0, bl: 0, br: 0 };

  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    let bucketName;
    if (r < midRow && c < midCol) bucketName = "tl";
    else if (r < midRow && c >= midCol) bucketName = "tr";
    else if (r >= midRow && c < midCol) bucketName = "bl";
    else bucketName = "br";

    let bucket = quads[bucketName];
    let u = used[bucketName];

    if (u < bucket.length) {
      const v = bucket[u];
      grid[idx] = v;
      remainingM5.delete(v);
      used[bucketName] = u + 1;
    } else {
      // 該區用完就從其他區塞
      const allBuckets = ["tl", "tr", "bl", "br"];
      let filled = false;
      for (let k of allBuckets) {
        if (used[k] < quads[k].length) {
          const v2 = quads[k][used[k]];
          grid[idx] = v2;
          remainingM5.delete(v2);
          used[k] += 1;
          filled = true;
          break;
        }
      }
      if (!filled) {
        const iter = remainingM5.values();
        const first = iter.next();
        if (!first.done) {
          grid[idx] = first.value;
          remainingM5.delete(first.value);
        } else {
          grid[idx] = 1;
        }
      }
    }
  }

  return grid;
}

// M6：大獎固定區（假設較大的數字偏向底部 3 行）
function generateM6(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);

  const allVals = Array.from({ length: total }, (_, i) => i + 1);
  shuffleArray(allVals, next);

  const remainingM6 = new Set(allVals);


  const bigCount = Math.max(5, Math.floor(total * 0.1)); // 10% 作為「大獎候選」
  const bigVals = allVals.slice(total - bigCount);
  const smallVals = allVals.slice(0, total - bigCount);

  shuffleArray(bigVals, next);
  shuffleArray(smallVals, next);

  const grid = new Array(total);
  let bigIdx = 0;
  let smallIdx = 0;
  const bottomStartRow = Math.max(0, rows - 3);

  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    if (r >= bottomStartRow && bigIdx < bigVals.length) {
      const v = bigVals[bigIdx++];
      grid[idx] = v;
      remainingM6.delete(v);
    } else {
      if (smallIdx < smallVals.length) {
        const vSmall = smallVals[smallIdx++];
        grid[idx] = vSmall;
        remainingM6.delete(vSmall);
      } else if (bigIdx < bigVals.length) {
        const v2 = bigVals[bigIdx++];
        grid[idx] = v2;
        remainingM6.delete(v2);
      } else {
        const iter = remainingM6.values();
        const first = iter.next();
        if (!first.done) {
          grid[idx] = first.value;
          remainingM6.delete(first.value);
        } else {
          grid[idx] = 1;
        }
      }
    }
  }

  return grid;
}

// M7：鏡射 / 旋轉母版（先用 M1，再依 seed 做簡單變換）
function generateM7(seed, cols, rows) {
  const total = cols * rows;
  const base = generateM1(seed, total);

  const mode = (seed >>> 0) & 0x3; // 0..3
  const grid = new Array(total);

  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;

    let rr = r;
    let cc = c;

    if (mode === 1) {
      // 左右鏡射
      cc = cols - 1 - c;
    } else if (mode === 2) {
      // 上下鏡射
      rr = rows - 1 - r;
    } else if (mode === 3) {
      // 左右 + 上下
      cc = cols - 1 - c;
      rr = rows - 1 - r;
    }

    const srcIdx = rr * cols + cc;
    grid[idx] = base[srcIdx];
  }

  return grid;
}

// M8：行列權重模型（越右、越下權重越高）
function generateM8(seed, cols, rows) {
  const total = cols * rows;
  const next = makeLCG(seed);

  const cells = [];
  for (let idx = 0; idx < total; idx++) {
    const r = Math.floor(idx / cols);
    const c = idx % cols;
    const weight = r + 1 + (c + 1); // 越右下，權重越高
    const noise = next() & 0xffff;
    const score = weight * 100000 + noise;
    cells.push({ idx, score });
  }

  cells.sort((a, b) => a.score - b.score);

  const vals = Array.from({ length: total }, (_, i) => i + 1);
  shuffleArray(vals, next);

  const remainingM8 = new Set(vals);

  const grid = new Array(total);
  for (let i = 0; i < total; i++) {
    const cell = cells[i];
    grid[cell.idx] = vals[i];
  }

  return grid;
}

// 主函式：依 speed 選擇模型
export function generatePermutationFromSpeed(speed, cols, rows) {
  const total = cols * rows;
  if (!Number.isInteger(speed)) speed = 0;
  const band = Math.floor((speed >>> 0) / 10000);
  const modelIndex = band % 8; // 0..7
  const seed = (speed >>> 0) || 1;

  switch (modelIndex) {
    case 0:
      return generateM1(seed, total);
    case 1:
      return generateM2(seed, cols, rows);
    case 2:
      return generateM3(seed, cols, rows);
    case 3:
      return generateM4(seed, cols, rows);
    case 4:
      return generateM5(seed, cols, rows);
    case 5:
      return generateM6(seed, cols, rows);
    case 6:
      return generateM7(seed, cols, rows);
    case 7:
    default:
      return generateM8(seed, cols, rows);
  }
}