//misc interface utils

function cloneCanvas(can) {
  let ncan = document.createElement('canvas');
  let nctx = ncan.getContext('2d');
  ncan.width = can.width;
  ncan.height = can.height;
  nctx.drawImage(can, 0, 0);
  return ncan;
}

function clamp(n, low, high) {
  return Math.max(Math.min(n, high), low);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function map(n, start1, stop1, start2, stop2, withinBounds) {
  const newval = (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
  if (!withinBounds) {
    return newval;
  }
  if (start2 < stop2) {
    return clamp(newval, start2, stop2);
  } else {
    return clamp(newval, stop2, start2);
  }
}

function snapToPt(pt, cellSize) {
  let cell = Math.round(pt / (cellSize));
  return cell * (cellSize);
}

  //shuffle array function with deterministic seed
function shuffle(array, seed) {
  let m = array.length, t, i;
  //deterministic seed function
  let seedFunc = function() {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
  };
  // While there remain elements to shuffle…
  while (m) {
    // Pick a remaining element…
    i = Math.floor(seedFunc() * m--);
    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }
  return array;
}

// Gaussian random generator (Box–Muller)
function randomGaussian(mean = 0, stddev = 1) {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stddev + mean;
}

// Generate a random 3D point in [-1, 1]
function randomGaussian3D(mean = 0, stddev = 0.3) {
  let x = Math.max(-1, Math.min(1, randomGaussian(mean, stddev)));
  let y = Math.max(-1, Math.min(1, randomGaussian(mean, stddev)));
  let z = Math.max(-1, Math.min(1, randomGaussian(mean, stddev)));
  return [x, y, z];
}

export { cloneCanvas, map, clamp, snapToPt, shuffle, lerp, randomGaussian, randomGaussian3D };