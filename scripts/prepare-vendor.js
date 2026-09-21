const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'node_modules', 'pdfjs-dist', 'build');
const targetDir = path.join(root, 'vendor', 'pdfjs');
const files = ['pdf.min.mjs', 'pdf.worker.min.mjs'];

fs.mkdirSync(targetDir, { recursive: true });

for (const file of files) {
  const source = path.join(sourceDir, file);
  const target = path.join(targetDir, file);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing ${source}. Run npm install first.`);
  }
  fs.copyFileSync(source, target);
  console.log(`Copied ${file}`);
}
