// @ts-check
const { test, expect } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const PLAYWRIGHT_DEBUG_DIR = path.join(__dirname, "..", "playwright-debug");

const countryDomain = process.env.COUNTRY_HOSTNAME
  ? process.env.COUNTRY_HOSTNAME
  : "parkrun.org.uk";

function safeDebugFilename(title) {
  return title.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 80);
}

async function saveDebugArtifactsOnFailure(page, testInfo) {
  if (testInfo.status !== "failed") return;
  try {
    fs.mkdirSync(PLAYWRIGHT_DEBUG_DIR, { recursive: true });
    const baseName = safeDebugFilename(testInfo.title);
    const htmlPath = path.join(PLAYWRIGHT_DEBUG_DIR, `${baseName}.html`);
    const html = await page.content();
    fs.writeFileSync(htmlPath, html, "utf8");
  } catch (_) {
    // Ignore (e.g. page closed or no page)
  }
}

function getFixturePath(hostname, athleteId, suffix) {
  return path.join(
    __dirname,
    "..",
    "supporting-data",
    "sites",
    hostname,
    "contents",
    "parkrunner",
    athleteId,
    suffix,
    "index.html",
  );
}

const ONE_PX_TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function getVolunteerFixturePath(hostname, athleteId) {
  return path.join(
    __dirname,
    "..",
    "supporting-data",
    "sites",
    hostname,
    "contents",
    "parkrunner",
    athleteId,
    "index.html",
  );
}

/**
 * Install route mocks so tests need no network: main doc, volunteer fetch,
 * events.json, and OSM tiles are fulfilled from fixtures; all other requests
 * are aborted. Call before page.goto().
 */
async function installNetworkFreeMocks(page, hostname, athleteId) {
  const mainUrl = `https://www.${hostname}/parkrunner/${athleteId}/all/`;
  const volunteerUrl = `https://www.${hostname}/parkrunner/${athleteId}/`;
  const mainPath = getFixturePath(hostname, athleteId, "all");
  const volunteerPath = getVolunteerFixturePath(hostname, athleteId);
  const eventsPath = path.join(
    __dirname,
    "..",
    "supporting-data",
    "sites",
    "images.parkrun.com",
    "contents",
    "events.json",
  );

  if (!fs.existsSync(mainPath)) {
    throw new Error(
      `Fixture not found: ${mainUrl} (${mainPath}). Run ui-test/update.sh to refresh.`,
    );
  }
  if (!fs.existsSync(volunteerPath)) {
    throw new Error(
      `Volunteer fixture not found: ${volunteerUrl} (${volunteerPath}). Run ui-test/update.sh to refresh.`,
    );
  }
  if (!fs.existsSync(eventsPath)) {
    throw new Error(`Fixture not found: ${eventsPath}`);
  }

  const mainHtml = fs.readFileSync(mainPath, "utf8");
  const volunteerHtml = fs.readFileSync(volunteerPath, "utf8");
  const eventsJson = fs.readFileSync(eventsPath, "utf8");

  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url === mainUrl) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: mainHtml,
      });
    }
    if (url === volunteerUrl) {
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: volunteerHtml,
      });
    }
    if (url.startsWith("https://images.parkrun.com/") && url.includes("events.json")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: eventsJson,
      });
    }
    if (url.includes("tile.openstreetmap.org")) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: ONE_PX_TRANSPARENT_PNG,
      });
    }
    return route.abort();
  });
}

test.afterEach(async ({ page }, testInfo) => {
  await saveDebugArtifactsOnFailure(page, testInfo);
});

test(
  "Userscript renders explorer map and badges on a parkrun results page",
  async ({ page }, testInfo) => {
  // Load the built userscript bundle from the website assets.
  const userscriptPath = path.join(
    __dirname,
    "..",
    "..",
    "..",
    "..",
    "..",
    "..",
    "..",
    "website",
    "assets",
    "js",
    "running-challenges.user.js",
  );

  if (!fs.existsSync(userscriptPath)) {
    throw new Error(
      `Userscript bundle not found at ${userscriptPath}. Run ./script/update from the repo root to build it.`,
    );
  }

  // Capture console output and page errors for debugging the userscript behaviour.
  const consoleEvents = [];
  page.on("console", (msg) => {
    consoleEvents.push({ type: msg.type(), text: msg.text() });
  });
  page.on("pageerror", (err) => {
    consoleEvents.push({ type: "pageerror", text: err.message });
  });

  const saveConsoleAndRethrow = async (err) => {
    await testInfo.attach("userscript-console-and-errors.json", {
      body: JSON.stringify(consoleEvents, null, 2),
      contentType: "application/json",
    });
    fs.mkdirSync(PLAYWRIGHT_DEBUG_DIR, { recursive: true });
    fs.writeFileSync(
      path.join(PLAYWRIGHT_DEBUG_DIR, "userscript-console-and-errors.json"),
      JSON.stringify(consoleEvents, null, 2),
      "utf8",
    );
    throw err;
  };

  try {
  // Use the same fixture parkrunner as the basic extension test: 1309364 (Andy Taylor).
  await installNetworkFreeMocks(page, countryDomain, "1309364");

  // Listen for events.json before navigation so we never miss the response.
  const eventsJsonPromise = page.waitForResponse(
    (resp) =>
      resp.url().includes("events.json") && resp.status() === 200,
    { timeout: 15000 },
  );

  await page.goto(
    `https://www.${countryDomain}/parkrunner/1309364/all/`,
    {
      waitUntil: "domcontentloaded",
    },
  );

  // Inject the userscript after the page has loaded (matches Tampermonkey @run-at document-end).
  // addInitScript runs before the document exists and causes "Cannot read properties of undefined (reading 'createElement')".
  const userscriptSource = fs.readFileSync(userscriptPath, "utf8");
  await page.addScriptTag({ content: userscriptSource });
  await eventsJsonPromise;

  const messagesDiv = page.locator("#running_challenges_messages_div");
  await expect(messagesDiv).toHaveText(
    "Additional badges provided by Running Challenges",
    { timeout: 20000 },
  );
  const explorerMap = page.locator("#explorer_map");
  await expect(explorerMap).toHaveCount(1);
  } catch (err) {
    await saveConsoleAndRethrow(err);
  }
});

