const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'flamingo-times-template-v2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const failures = [];

function fail(message) {
  failures.push(message);
}

const scriptStart = html.indexOf('<script>');
const scriptEnd = html.lastIndexOf('</script>');
if (scriptStart === -1 || scriptEnd === -1 || scriptEnd <= scriptStart) {
  fail('Could not find the inline application script.');
} else {
  try {
    new Function(html.slice(scriptStart + '<script>'.length, scriptEnd));
  } catch (err) {
    fail(`Inline script syntax error: ${err.message}`);
  }
}

const forbiddenPatterns = [
  /https:\/\/cdnjs/i,
  /https:\/\/cdn\.jsdelivr/i,
  /node_modules\/pdfjs-dist\/build\/pdf\.min\.js/i,
  /canvas\.toDataURL\('image\/png'\)/i
];
for (const pattern of forbiddenPatterns) {
  if (pattern.test(html)) fail(`Forbidden production pattern found: ${pattern}`);
}

const requiredFiles = [
  'index.html',
  'assets/cover.jpg',
  'assets/page-zvernec-back.svg',
  'assets/page-zvernec-front.svg',
  'assets/page-zvernec-inside.svg',
  'assets/page-student-back.svg',
  'assets/sample-edition.pdf',
  'vendor/pdfjs/pdf.min.mjs',
  'vendor/pdfjs/pdf.worker.min.mjs',
  '.nojekyll'
];

for (const relative of requiredFiles) {
  const filePath = path.join(root, relative);
  if (!fs.existsSync(filePath)) {
    fail(`Missing required file: ${relative}`);
  } else if (fs.statSync(filePath).size === 0) {
    fail(`Required file is empty: ${relative}`);
  }
}

const assetRefs = [...html.matchAll(/assets\/[^'"`<>)\s]+/g)].map(match => match[0]);
for (const relative of new Set(assetRefs)) {
  if (!fs.existsSync(path.join(root, relative))) {
    fail(`HTML references missing asset: ${relative}`);
  }
}

if (!html.includes("new URL('vendor/pdfjs/pdf.min.mjs', APP_BASE_URL)")) {
  fail('PDF.js module URL should resolve from document.baseURI for GitHub Pages subpaths.');
}

if (!html.includes('PDF tools are unavailable because required site files are missing.')) {
  fail('HTML should contain user-friendly PDF engine error message.');
}

if (!html.includes('Back / Center') || !html.includes('Front / Left') || !html.includes('Front / Right')) {
  fail('User-facing paper names should use Back / Center, Front / Left, and Front / Right.');
}

if (!html.includes('class="workflow-guide"')) {
  fail('HTML should contain the compact workflow-guide component.');
}

const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
if (!indexHtml.includes('flamingo-times-template-v2.html')) {
  fail('index.html should link or redirect to the main studio HTML file.');
}

if (failures.length) {
  console.error(failures.map(item => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log('Static production checks passed.');
