const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const imgPath = process.argv[2];

if (!imgPath) {
  console.error('Usage: node analyze_reference_layout.js <reference-image.png>');
  process.exit(1);
}

const resolvedPath = path.resolve(imgPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`Image not found: ${resolvedPath}`);
  process.exit(1);
}

const data = fs.readFileSync(resolvedPath);
const png = PNG.sync.read(data);

const W = png.width;
const H = png.height;

console.log('Image dimensions:', W, 'x', H, 'aspect ratio:', (W / H).toFixed(3));

function findBounds({ yStart, yEnd, predicate }) {
  let minY = H;
  let maxY = 0;
  let minX = W;
  let maxX = 0;
  let found = false;

  for (let y = yStart; y < yEnd; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx + 1];
      const b = png.data[idx + 2];
      if (predicate(r, g, b)) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (!found) return null;
  return {
    x: (minX / W).toFixed(3),
    y: (minY / H).toFixed(3),
    w: ((maxX - minX) / W).toFixed(3),
    h: ((maxY - minY) / H).toFixed(3)
  };
}

console.log('Title bounds:', findBounds({
  yStart: 0,
  yEnd: Math.floor(H * 0.2),
  predicate: (r, g, b) => r < 60 && g < 60 && b < 60
}));

console.log('Logo bounds:', findBounds({
  yStart: Math.floor(H * 0.75),
  yEnd: H,
  predicate: (r, g, b) => (r > 200 && g > 200 && b > 200) || (r < 40 && g < 40 && b < 40)
}));

console.log('Overall papers group bounds:', findBounds({
  yStart: Math.floor(H * 0.15),
  yEnd: Math.floor(H * 0.85),
  predicate: (r, g, b) => r > 220 && g > 220 && b > 220
}));
