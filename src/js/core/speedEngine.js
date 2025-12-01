export function generatePermutationFromSpeed(speed, total) {
  const size = Number.isInteger(total) && total > 0 ? total : 0;
  const arr = Array.from({ length: size }, (_, i) => i + 1);

  let x = (Number.isInteger(speed) ? speed : 0) >>> 0;
  if (x === 0) x = 1;

  function next() {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x;
  }

  for (let i = size - 1; i > 0; i--) {
    const r = next();
    const j = r % (i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }

  return arr;
}
