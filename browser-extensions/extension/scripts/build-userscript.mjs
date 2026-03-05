#!/usr/bin/env node

import esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const extensionDir = path.resolve(__dirname, "..");
const rootDir = path.resolve(extensionDir, "..", "..");
const websiteJsDir = path.join(rootDir, "website", "assets", "js");
const outfile = path.join(websiteJsDir, "running-challenges.user.js");

const userscriptHeader = `// ==UserScript==
// @name         Running Challenges
// @namespace    https://running-challenges.co.uk/
// @version      0.1.0
// @description  Adds Running Challenges badges to your parkrun results page without installing a browser extension.
// @author       Running Challenges
// @match        https://www.parkrun.ca/parkrunner/*/all/
// @match        https://www.parkrun.co.at/parkrunner/*/all/
// @match        https://www.parkrun.co.nl/parkrunner/*/all/
// @match        https://www.parkrun.co.nz/parkrunner/*/all/
// @match        https://www.parkrun.co.za/parkrunner/*/all/
// @match        https://www.parkrun.com.au/parkrunner/*/all/
// @match        https://www.parkrun.com.de/parkrunner/*/all/
// @match        https://www.parkrun.dk/parkrunner/*/all/
// @match        https://www.parkrun.fi/parkrunner/*/all/
// @match        https://www.parkrun.fr/parkrunner/*/all/
// @match        https://www.parkrun.ie/parkrunner/*/all/
// @match        https://www.parkrun.it/parkrunner/*/all/
// @match        https://www.parkrun.jp/parkrunner/*/all/
// @match        https://www.parkrun.lt/parkrunner/*/all/
// @match        https://www.parkrun.my/parkrunner/*/all/
// @match        https://www.parkrun.no/parkrunner/*/all/
// @match        https://www.parkrun.org.uk/parkrunner/*/all/
// @match        https://www.parkrun.pl/parkrunner/*/all/
// @match        https://www.parkrun.ru/parkrunner/*/all/
// @match        https://www.parkrun.se/parkrunner/*/all/
// @match        https://www.parkrun.sg/parkrunner/*/all/
// @match        https://www.parkrun.us/parkrunner/*/all/
// @run-at       document-end
// @grant        none
// ==/UserScript==`;

const shim = `
(function () {
  // Provide a minimal chrome-style API so the extension code can run unchanged.
  if (typeof window.chrome === "undefined") {
    window.chrome = {};
  }
  var chrome = window.chrome;

  if (!chrome.runtime) {
    chrome.runtime = {
      getURL: function (path) {
        // In userscript mode everything is bundled; paths are only used for display or links.
        return path.replace(/^\\//, "");
      },
    };
  }

  // Always use our localStorage-backed shim so the script works without the extension.
  chrome.storage = chrome.storage || {};
  var prefix = "rc_";
  chrome.storage.local = {
      get: function (keysOrDefaults) {
        return new Promise(function (resolve) {
          var result = {};
          if (Array.isArray(keysOrDefaults)) {
            keysOrDefaults.forEach(function (key) {
              var raw = localStorage.getItem(prefix + key);
              if (raw != null) {
                try {
                  result[key] = JSON.parse(raw);
                } catch (_) {
                  result[key] = raw;
                }
              }
            });
          } else if (keysOrDefaults && typeof keysOrDefaults === "object") {
            Object.keys(keysOrDefaults).forEach(function (key) {
              var raw = localStorage.getItem(prefix + key);
              if (raw != null) {
                try {
                  result[key] = JSON.parse(raw);
                } catch (_) {
                  result[key] = raw;
                }
              } else {
                result[key] = keysOrDefaults[key];
              }
            });
          }
          resolve(result);
        });
      },
      set: function (items) {
        return new Promise(function (resolve) {
          Object.keys(items).forEach(function (key) {
            localStorage.setItem(prefix + key, JSON.stringify(items[key]));
          });
          resolve();
        });
      },
      remove: function (keys) {
        return new Promise(function (resolve) {
          if (!Array.isArray(keys)) keys = [keys];
          keys.forEach(function (key) {
            localStorage.removeItem(prefix + key);
          });
          resolve();
        });
      },
    };

  if (typeof window.browserAPI === "undefined") {
    window.browserAPI = chrome;
  }
  if (typeof window.extensionVersion === "undefined") {
    window.extensionVersion = "userscript";
  }
})();`;

async function build() {
  await esbuild.build({
    entryPoints: [path.join(extensionDir, "userscript", "entry.js")],
    bundle: true,
    minify: true,
    format: "iife",
    target: ["chrome100", "firefox100"],
    outfile,
    banner: {
      js: `${userscriptHeader}\n\n${shim}\n`,
    },
  });
  // eslint-disable-next-line no-console
  console.log(`Built userscript to ${outfile}`);
}

build().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

