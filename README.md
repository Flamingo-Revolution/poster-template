# Flamingo Times Cover Studio

A standalone browser studio for composing high-resolution Flamingo Times newspaper cover posters. Upload a PDF and it composes a ready-to-export poster automatically. The main creative work is choosing the color combination, logo pairing, and masthead typography; manual paper controls remain available only for fine-tuning.

## Production Status

This project is intentionally static and GitHub Pages friendly: deploy the HTML file, `assets/`, `vendor/`, and `.nojekyll` together. The app does not run `npm install` on GitHub Pages; `vendor/pdfjs` must already be committed or included in the published artifact.

Security and stability guardrails included:

- PDF.js is pinned through npm and served locally from `vendor/pdfjs`.
- Remote CDN script fallback has been removed.
- PDF scripting/eval is disabled during parsing.
- PDF uploads are capped at 25 MB and 24 pages.
- Image uploads are capped at 15 MB and 6000 px on the longest side.
- PNG export uses `canvas.toBlob()` instead of base64 `toDataURL()`.
- Startup shows a clear error if required assets fail to load.
- `npm audit --omit=dev` is expected to return zero vulnerabilities.

## User Experience & Workflow

The studio is designed so the designer does as little manual work as possible: upload a PDF (or click **Use Sample**), pick the look, click **Make Poster**, and download. Every other control is optional polish.

- **Quick Compose** — the primary panel at the top of the sidebar. It keeps the essential controls visible:
  1. **Upload PDF** — ingest any newspaper edition.
  2. **Use Sample** — loads the built-in 4-page sample edition instantly.
  3. **Format** — Instagram 4:5 (portrait) or 1:1 (square).
  4. **Visual Direction** — *Editorial Stack*, *Campaign Fan*, *Clean Feature*, *Hero Cover*, or *Two-Cover Compare*.
  5. **Featured Pages** — *Auto from PDF*, *1 Page*, *2 Pages*, *3 Pages*, or *Custom 4+*. A longer PDF uses *Custom 4+* so the designer can choose which pages to feature in the 3-paper poster.
  6. **Color Combination** — compact swatches for curated poster palettes such as *Flamingo Mauve*, *Protest Red*, *Paper Cream*, *Night Edition*, *Coastal Blue*, *Black & Red*, *Rose Paper*, *Civic Teal*, *Signal Yellow*, and more. Each swatch sets background, ink, and a recommended logo pairing.
  7. **Logo Pairing** — designer-friendly logo choices, including *Auto Best Pairing*, *White + Black*, *Pink + Cream*, *Red + White*, and single-color logo modes.
  8. **Masthead Font** — *Classic Serif* or *Blackletter*.
  9. **Masthead Size / Metadata Size** — ratio-based sliders that affect the live canvas and exported PNG.
  10. **Apply Best Contrast** — returns text/logo pairing to automatic contrast.
  11. **Make Poster** — the "do the work for me" button. Runs page assignment, applies the chosen direction's tasteful paper positions/rotation/scale, sets a good shadow depth, and preserves the chosen color/logo/type direction.
  12. **Download PNG** — full-resolution export, shown in a compact "ready" panel with the current dimensions and direction.
- **Auto-compose on upload**: as soon as a PDF finishes loading (uploaded or sampled), the app assigns pages, picks a fitting visual direction for the page count (1 page → Hero Cover, 2 → Two-Cover Compare, 3+ → Editorial Stack), and renders a finished-looking poster automatically — no extra clicks required. Status reads **"Poster ready"**; clicking **Make Poster** afterwards reads **"Poster composed"**.
- **Fine Tune (collapsed by default)**: detailed manual controls live in four collapsible sections so they don't overwhelm the default view — *Selected Paper* (drag/position/rotation/scale, page reassignment), *Text & Masthead*, *Colors & Logo*, and *Advanced* (explicit layout presets, global scale, shadow, Start Over). Direct canvas manipulation (drag to move, scroll wheel to rotate) still works at any time.
- **Descriptive Paper Naming**: Replaced generic labels across the UI with clear spatial roles — no array indexes:
  - `Back / Center` (background layer, rot `-5.5°`)
  - `Front / Left` (foreground-left layer, rot `-17.5°`)
  - `Front / Right` (foreground-right layer, rot `+19.0°`)
- **Friendly Error UX**:
  - Missing engine files display: `PDF tools are unavailable because required site files are missing.`, with an expandable technical details block for debugging.
  - Size-limit errors state limits directly:
    - *PDFs max 25 MB and 24 pages.*
    - *Images max 15 MB and 6000 px longest side.*
- **Loading & Disabled States**:
  - Upload input disables while PDF pages render, preventing duplicate concurrent loads.
  - Controls always re-enable on success or failure.
- **Export & Action Feedback**:
  - Successful PNG download shows: `PNG exported: [filename]`.
  - Failed export shows recovery advice: `Export failed. Try using a smaller PDF or fewer high-resolution images.`.

## Designer Flow

1. Upload a PDF or click **Use Sample**.
2. Choose how many pages to feature: 1, 2, 3, or Custom 4+ for longer PDFs.
3. Choose a color combination.
4. Choose a logo pairing and masthead style, including **Blackletter** when the poster needs a more historic/editorial tone.
5. Adjust masthead or metadata size if needed.
6. Click **Make Poster**.
7. Download PNG.

## Requirements

- Node.js 20 or newer
- A modern browser
- Local or hosted HTTP(S) serving. Opening the HTML directly from the filesystem is not recommended because browsers restrict module workers and asset loading.

## Setup

```bash
npm install
npm run prepare:vendor
npm test
npm run audit
npm run serve
```

Then open:

```text
http://127.0.0.1:8085/flamingo-times-template-v2.html
```

## Useful Scripts

```bash
npm run prepare:vendor
```

Copies the pinned PDF.js browser module and worker into `vendor/pdfjs`.

```bash
npm test
```

Runs static production checks and the Playwright browser smoke test.

```bash
npm run test:static
```

Checks inline script syntax, required assets, required vendor files, and no accidental CDN/old PDF.js references.

```bash
npm run test:e2e
```

Starts the local server and verifies the app loads, paints the canvas, imports the sample PDF, and creates a PNG download.

```bash
npm run audit
```

Runs the production dependency audit.

```bash
npm run serve
```

Starts a no-cache local static server on `127.0.0.1:8085`.

## Repository Structure

```text
poster-template/
├── assets/                         # Brand, page, and sample PDF assets
├── scripts/
│   ├── prepare-vendor.js           # Copies required PDF.js runtime files
│   ├── serve.js                    # Local static server
│   └── static-check.js             # Production smoke checks
├── vendor/pdfjs/                   # Browser runtime copied from pdfjs-dist
├── analyze_reference_layout.js     # Optional PNG layout-analysis CLI
├── flamingo-times-template-v2.html # Main browser app
├── package-lock.json
├── package.json
└── README.md
```

## Deployment

1. Run `npm ci`.
2. Run `npm run prepare:vendor`.
3. Run `npx playwright install chromium` if the deployment/CI machine does not already have Playwright browsers installed.
4. Run `npm test && npm run audit`.
5. Deploy `index.html`, `flamingo-times-template-v2.html`, `assets/`, `vendor/`, and `.nojekyll` to GitHub Pages or another static host.

For a GitHub Pages project site such as `https://USER.github.io/REPO/`, keep this repo layout at the published root:

```text
REPO/
├── .nojekyll
├── index.html
├── flamingo-times-template-v2.html
├── assets/
└── vendor/
    └── pdfjs/
        ├── pdf.min.mjs
        └── pdf.worker.min.mjs
```

If the PDF upload button shows an error mentioning `vendor/pdfjs/pdf.min.mjs`, the deployed site is missing the `vendor/` folder or GitHub Pages is publishing a different branch/folder than the one containing it.

Recommended HTTP headers:

```text
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'
```

The app currently uses inline CSS and inline JavaScript, so a stricter CSP would require moving those blocks into separate files.

## Reference Analysis Utility

To inspect a PNG reference layout:

```bash
node analyze_reference_layout.js path/to/reference.png
```

The script prints normalized bounds for the masthead, logo, and paper group.
