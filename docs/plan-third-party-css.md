# Plan: Finish third-party CSS (source from npm)

## Current state (after implementation)

- **Leaflet core**: CSS and images already come from npm in the build (`leaflet/dist/leaflet.css`, `leaflet/dist/images`). No patch.
- **leaflet.fullscreen**: CSS and icons already from npm (`Control.FullScreen.css`, `icon-fullscreen*.png`). No patch.
- **leaflet.markercluster**: CSS already from npm (`MarkerCluster.css`, `MarkerCluster.Default.css`). No patch.
- **leaflet-extramarkers**: **Done.** CSS and images are now sourced from the `leaflet-extra-markers` npm package in the build script. Extension URL rewriting is done in-script (no patch files); the vendored `css/third-party/leaflet-extramarkers` directory has been removed.

The only remaining “third-party CSS” to finish was **leaflet-extramarkers**; it is now sourced from npm with in-build URL rewriting.

## Goal

1. Source leaflet-extramarkers **CSS and images** from `node_modules/leaflet-extra-markers` (e.g. `dist/` or equivalent) in the build, same as we do for JS.
2. Keep extension URL rewriting (Chrome vs Firefox) so marker images load correctly in the extension context.
3. Remove the vendored `css/third-party/leaflet-extramarkers` from the repo (and update patches/README if needed).

## Steps

### 1. Confirm npm package layout

- From repo root (or `browser-extensions/extension` where `nm` points): inspect `node_modules/leaflet-extra-markers` (or the pnpm-linked path).
- Find:
  - CSS file (e.g. `dist/leaflet.extra-markers.css` or `dist/css/...`).
  - Image directory and filenames (e.g. `images/markers_default.png`, `markers_shadow.png`, `*@2x.png`). Our patches reference `images/`; the package might use `img/` or `images/`.
- If the npm CSS uses different paths (e.g. `img/` instead of `images/`), we have two options:
  - **A)** Copy npm CSS and images into the build under the paths the manifest and patches expect (`css/third-party/leaflet-extramarkers/` with `leaflet.extra-markers.css` and `images/`), then apply existing patches if the CSS content still matches.
  - **B)** Copy from npm as-is, then do URL rewriting in the build script (Node) instead of patch files: replace `url('images/...')` (or whatever the npm file uses) with the correct extension URL for each browser. That avoids patch brittleness when npm package content changes.

### 2. Change the build script

- **Current:** `cp -r css/third-party/leaflet-extramarkers "${buildDir}/css/third-party/"` (from repo root).
- **New:**
  - Copy leaflet-extramarkers **CSS** from npm into `"${buildDir}/css/third-party/leaflet-extramarkers/"` (e.g. to `leaflet.extra-markers.css`).
  - Copy leaflet-extramarkers **images** from npm into `"${buildDir}/css/third-party/leaflet-extramarkers/images/"` (same path the CSS expects after rewriting).
- Keep applying the existing Chrome/Firefox patches **if** the npm CSS is byte-for-byte or line-for-line close enough that `patch -p0` still applies. If not, implement **Option B**: after copying, read the CSS in Node, replace `url('images/...')` with the appropriate `chrome-extension://` or `moz-extension://` URL, and write the result. Then we can remove the leaflet-extramarkers patch files.

### 3. Verify and remove vendored CSS

- Run the full extension build and load in Chrome and Firefox; confirm marker icons (e.g. on the explorer map) render.
- Run the Playwright UI tests (including “Leaflet markers load with icons (no network)”) to guard regressions.
- Remove the vendored directory at repo root: `css/third-party/leaflet-extramarkers/` (and any other vendored third-party CSS that’s now fully from npm).
- If we switched to in-script URL rewriting, remove `patches/chrome/css_third-party_leaflet-extramarkers_*.patch` and `patches/firefox/css_third-party_leaflet-extramarkers_*.patch` and update `patches/README.md` to drop the leaflet-extramarkers example if it’s the only one left.

### 4. Update docs

- **pnpm-migration.md**: In the “Optional later steps” bullet for third-party JS/CSS, change the sentence that says “CSS that is patched for extension URLs (leaflet, leaflet-extramarkers) remains in `css/third-party/` at repo root” to state that leaflet-extramarkers CSS (and images) are now sourced from npm, with URL rewriting either via existing patches or via build-script replacement.

## Risks / notes

- **Patch apply failure**: If the npm dist CSS differs (whitespace, line endings, or content), the current patches may not apply. Prefer in-build URL rewriting (Option B) for a single source of truth and fewer patch files to maintain.
- **Image path mismatch**: If the npm package uses `img/` instead of `images/`, copy or symlink into `images/` in the build so the rewritten CSS still matches.
- **No other vendored CSS**: After this, the only remaining vendored assets in the plan are **leaflet-canvasicon** and **leaflet-piechart** (JS only; no npm equivalents called out). No further “third-party CSS” to migrate for the current plan.

## Out of scope (unchanged)

- leaflet-canvasicon and leaflet-piechart remain vendored (JS only).
- No new bundler or build tool; we only change where leaflet-extramarkers CSS/images come from and how extension URLs are applied.
