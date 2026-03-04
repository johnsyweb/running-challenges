# pnpm migration plan

A planned refactor to unify the browser-extension codebase and manage dependencies with [pnpm](https://pnpm.io/), so we maintain a single source tree and produce Chrome and Firefox bundles from it.

## Why

- **Single source of truth**: Today we have `browser-extensions/common` plus browser-specific `chrome` and `firefox` dirs (manifests, patches). That duplicates structure and makes it easy for behaviour to drift between browsers.
- **Reproducible tooling**: pnpm gives us lockfiles, a single place for dev/build dependencies, and consistent installs across machines and CI.
- **Easier evolution**: A unified `src/` tree and a Node-based build make it straightforward to add a bundler later, move third-party libs into proper dependencies, and keep tests importing from the same code paths as the extension.

## What

- **pnpm workspace** for the extension (and optionally tests): one `package.json` (e.g. under `browser-extensions/extension/`) owning `web-ext` and other build/test tools, with a lockfile.
- **Unified extension layout**: One `browser-extensions/extension/src/` tree (background, content-scripts, lib, etc.) instead of `common` plus separate chrome/firefox source dirs. Browser differences live in **data** (manifest variants, small build-time flags), not in duplicated code.
- **Node build script**: A script (e.g. `scripts/build-extension.mjs`) that copies shared code into a staging dir, applies per-browser manifest overrides, runs patches, and writes `build/chrome` and `build/firefox`. Existing `web-ext build` / `web-ext lint` stay, invoked from this script.
- **Scripts wired to pnpm**: `./script/update`, `./script/setup`, and CI call the new pnpm-backed build instead of the current bash-only extension scripts, once the migration is complete.
- **Incremental third-party handling**: Keep large vendored libs (e.g. Leaflet) as-is at first; move them to npm dependencies and optionally add a small bundler step when convenient.

## How

1. **Introduce pnpm and extension package** ✅ *Done*
   - Add `pnpm-workspace.yaml` and `browser-extensions/extension/package.json` with `web-ext` and any shared dev deps.
   - Run `pnpm install` from the repo root; ensure CI uses pnpm (e.g. `pnpm install --frozen-lockfile`) where the extension is built or tested.

2. **Restructure into a single `src/` tree**
   - Create `browser-extensions/extension/src/` and move/copy current `browser-extensions/common` content into it (e.g. `src/js`, `src/html`, `src/css`).
   - Define manifest fragments or overrides (e.g. `manifest.base.json` + `manifest.chrome.json` / `manifest.firefox.json`) so one merge step produces the final manifest per browser.
   - Keep `patches/chrome` and `patches/firefox` for any remaining CSS/asset differences; avoid browser-specific JS unless necessary.

3. **Add Node build script**
   - Implement a script that: (a) copies `src/` and static assets into a temp dir, (b) writes version and build ID into generated files, (c) merges in the correct manifest per target, (d) applies the relevant patches, (e) runs `web-ext build` (and optionally `web-ext lint` for Firefox) for each target.
   - Output remains `browser-extensions/chrome/build` and `browser-extensions/firefox/build` (or equivalent) so existing CI and `./script/server` behaviour stay the same.

4. **Point scripts and CI at the new build**
   - Change `script/bootstrap` to use pnpm for installing extension tooling and test deps where appropriate.
   - Change `script/update` / `script/setup` to run the Node build script (e.g. `pnpm run build:extension` or similar) instead of `build/extension-chrome/build.sh` and `build/extension-firefox/build.sh`.
   - Update GitHub Actions to run the pnpm-based build and tests; remove or archive the old bash extension build scripts once the new path is stable.

5. **Optional later steps**
   - Move unit tests under the same workspace and have them import from `src/` so they run against the same code the extension uses.
   - Replace vendored third-party JS/CSS with npm packages and add a small bundler (e.g. esbuild) for content/background scripts if desired.

This plan is intended to be done in small, reviewable steps so the extension keeps building and passing tests after each change.
