#!/usr/bin/env node
/**
 * Build Chrome and Firefox extensions from browser-extensions/extension/src.
 * Expects EXTENSION_BUILD_VERSION and EXTENSION_BUILD_ID in env (set by caller from build/version.sh).
 * Run from repo root so that paths resolve correctly; or from extension package dir (script resolves root).
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const extensionDir = path.resolve(__dirname, "..");
const candidateRoot = path.resolve(extensionDir, "../..");
const root = fs.existsSync(path.join(candidateRoot, "build/version.sh"))
  ? candidateRoot
  : process.cwd();

const EXTENSION_BUILD_VERSION = process.env.EXTENSION_BUILD_VERSION || "2.0.0";
const EXTENSION_BUILD_ID = process.env.EXTENSION_BUILD_ID || "0";

const srcDir = path.join(extensionDir, "src");
const manifestDir = path.join(srcDir, "manifest");

function deepMerge(base, override) {
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      key in result &&
      typeof result[key] === "object" &&
      result[key] !== null &&
      !Array.isArray(result[key]) &&
      typeof override[key] === "object" &&
      override[key] !== null &&
      !Array.isArray(override[key])
    ) {
      result[key] = deepMerge(result[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  return result;
}

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: root, ...opts });
}

function buildBrowser(browser) {
  const buildDir = path.join(root, "browser-extensions", browser, "build");
  const patchesDir = path.join(root, "patches", browser);

  console.log(`Building ${browser} extension...`);

  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true });
  }
  fs.mkdirSync(buildDir, { recursive: true });

  run(
    `mkdir -p "${buildDir}/images/badges" "${buildDir}/images/flags" "${buildDir}/css/third-party" "${buildDir}/js/lib/third-party"`,
  );
  run(`cp -r images/badges/256x256/*.png "${buildDir}/images/badges/"`);
  run(`cp -r images/flags/twemoji/png/*.png "${buildDir}/images/flags/"`);
  run(`cp -r images/logo "${buildDir}/images/"`);
  run(
    `cp -r css/third-party/leaflet css/third-party/leaflet-extramarkers css/third-party/leaflet-fullscreen css/third-party/leaflet-markercluster "${buildDir}/css/third-party/"`,
  );
  run(
    `cp -r js/lib/third-party/jquery js/lib/third-party/leaflet js/lib/third-party/leaflet-canvasicon js/lib/third-party/leaflet-extramarkers js/lib/third-party/leaflet-fullscreen js/lib/third-party/leaflet-markercluster js/lib/third-party/leaflet-piechart js/lib/third-party/d3-voronoi "${buildDir}/js/lib/third-party/"`,
  );
  run(
    `rsync -av browser-extensions/extension/src/js "${buildDir}" --exclude tests`,
  );
  run(
    `cp -r browser-extensions/extension/src/html browser-extensions/extension/src/css "${buildDir}/"`,
  );
  if (fs.existsSync(path.join(srcDir, "images"))) {
    run(
      `cp -r browser-extensions/extension/src/images/* "${buildDir}/images/"`,
    );
  }

  fs.writeFileSync(
    path.join(buildDir, "js/lib/version.js"),
    `var extensionVersion = "${EXTENSION_BUILD_VERSION}"\n`,
  );

  const baseManifest = JSON.parse(
    fs.readFileSync(path.join(manifestDir, "base.json"), "utf8"),
  );
  const overrideManifest = JSON.parse(
    fs.readFileSync(path.join(manifestDir, `${browser}.json`), "utf8"),
  );
  const manifest = deepMerge(baseManifest, overrideManifest);
  let manifestStr = JSON.stringify(manifest, null, 2);
  manifestStr = manifestStr
    .replace(/REPLACE_EXTENSION_BUILD_VERSION/g, EXTENSION_BUILD_VERSION)
    .replace(/REPLACE_EXTENSION_BUILD_ID/g, EXTENSION_BUILD_ID);
  fs.writeFileSync(path.join(buildDir, "manifest.json"), manifestStr + "\n");

  const patchFiles = fs
    .readdirSync(patchesDir)
    .filter((f) => f.endsWith(".patch"));
  for (const f of patchFiles) {
    run(`patch -p0 --directory "${buildDir}" < "${path.join(patchesDir, f)}"`);
  }

  run(`web-ext build`, { cwd: buildDir });
  if (browser === "firefox") {
    try {
      run(`web-ext lint`, { cwd: buildDir });
    } catch (_) {
      // lint can fail (e.g. Bus error on some platforms); build already ran
    }
  }

  const artifactsDir = path.join(buildDir, "web-ext-artifacts");
  const zips = fs
    .readdirSync(artifactsDir)
    .filter((f) => f.startsWith("running_challenges-") && f.endsWith(".zip"));
  for (const zip of zips) {
    if (!zip.includes(`running_challenges-${browser}`)) {
      const newName = zip.replace(
        "running_challenges-",
        `running_challenges-${browser}-`,
      );
      fs.renameSync(
        path.join(artifactsDir, zip),
        path.join(artifactsDir, newName),
      );
    }
  }

  const finalZips = fs
    .readdirSync(artifactsDir)
    .filter((f) => f.endsWith(".zip"));
  finalZips.forEach((f) => console.log(path.join(artifactsDir, f)));
}

buildBrowser("chrome");
buildBrowser("firefox");
console.log("Extension build complete.");
