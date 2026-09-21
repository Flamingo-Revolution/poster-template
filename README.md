# Flamingo Times Cover Studio

A standalone browser studio for composing high-resolution Flamingo Times newspaper cover posters. It supports built-in issue artwork, user PDF ingestion, direct canvas manipulation, and PNG export.

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
5. Deploy `flamingo-times-template-v2.html`, `assets/`, `vendor/`, and `.nojekyll` to GitHub Pages or another static host.

For a GitHub Pages project site such as `https://USER.github.io/REPO/`, keep this repo layout at the published root:

```text
REPO/
├── .nojekyll
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
