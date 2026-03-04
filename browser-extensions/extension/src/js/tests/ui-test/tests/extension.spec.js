// @ts-check
// const { test, expect } = require('@playwright/test');

// Some more help taken from https://www.petroskyriakou.com/how-to-load-a-chrome-extension-in-playwright
// https://playwright.dev/docs/chrome-extensions hasn't been particularly helpful

const { test: base, expect, chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const countryDomain = process.env.COUNTRY_HOSTNAME
  ? process.env.COUNTRY_HOSTNAME
  : "parkrun.org.uk";

const extensionPath = path.join(
  __dirname,
  "../extension-binaries/chrome-extension-package/",
); // make sure this is correct

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

async function mockParkrunRunnerPage(page, hostname, athleteId, suffix) {
  const url = `https://www.${hostname}/parkrunner/${athleteId}/${suffix}/`;
  const fixturePath = getFixturePath(hostname, athleteId, suffix);
  if (!fs.existsSync(fixturePath)) {
    throw new Error(
      `Fixture not found: ${url} (expected ${fixturePath}). Run ui-test/update.sh to refresh fixtures.`,
    );
  }
  const body = fs.readFileSync(fixturePath, "utf8");
  await page.route(url, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body }),
  );
}

async function mockEventsJson(page) {
  const fixturePath = path.join(
    __dirname,
    "..",
    "supporting-data",
    "sites",
    "images.parkrun.com",
    "contents",
    "events.json",
  );
  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }
  const body = fs.readFileSync(fixturePath, "utf8");
  await page.route("https://images.parkrun.com/events.json", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body }),
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
 * Install route mocks so the Leaflet test needs no network: main doc, volunteer
 * fetch, events.json, and OSM tiles are fulfilled from fixtures; all other
 * requests are aborted. Call before page.goto().
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
    if (url === "https://images.parkrun.com/events.json") {
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

const test = base.extend({
  context: async ({ browserName }, use) => {
    const browserTypes = { chromium };
    const launchOptions = {
      channel: "chromium",
      devtools: false,
      headless: true,
      args: [
        `--headless=new`,
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
      viewport: {
        width: 1920,
        height: 1080,
      },
      // Is this how you accept self-signed certificates?
      ignoreHTTPSErrors: true,
    };

    const context = await browserTypes[browserName].launchPersistentContext(
      "",
      launchOptions,
    );
    await use(context);
    await context.close();
  },
});

// await page.screenshot({ path: 'screenshot.png', fullPage: true });

test("Basic extension load test", async ({ page }) => {
  console.log(
    `Expecting the extension to have been loaded from ${extensionPath}`,
  );

  await page.goto(`https://www.${countryDomain}/parkrunner/1309364/all/`);

  // Wait 3 seconds, this should be plenty as we are serving all the data locally and there shoudn't be
  // any internet calls
  await page.waitForTimeout(3000);

  // This takes a screenshot of the entire page, which is probably a good idea to do early on,
  // but we should really wait until the extension has loaded.
  await page.screenshot({ path: "screenshot.png", fullPage: true });

  let messagesDiv = page.locator("#running_challenges_messages_div");

  await expect(messagesDiv).toHaveText(
    "Additional badges provided by Running Challenges",
    { timeout: 10000 },
  );
});

test("No results for parkrunner load test", async ({ page }) => {
  console.log(
    `Expecting the extension to have been loaded from ${extensionPath}`,
  );

  await page.goto(`https://www.${countryDomain}/parkrunner/999999/all/`);

  // Wait 3 seconds, this should be plenty as we are serving all the data locally and there shoudn't be
  // any internet calls
  await page.waitForTimeout(3000);

  // Expect a title "to contain" a substring, this probably won't work on anything other than english language sites.
  // await expect(page).toHaveTitle(/results/, { timeout: 1000 });

  // This takes a screenshot of the entire page, which is probably a good idea to do early on,
  // but we should really wait until the extension has loaded.
  await page.screenshot({ path: "screenshot.png", fullPage: true });

  let messagesDiv = page.locator("#running_challenges_messages_div");

  await expect(messagesDiv).toHaveText(
    "No results detected, no challenge data will be compiled",
    { timeout: 10000 },
  );
});

test("Leaflet markers load with icons (no network)", async ({ page }) => {
  await installNetworkFreeMocks(page, countryDomain, "1309364");
  await page.goto(`https://www.${countryDomain}/parkrunner/1309364/all/`, {
    waitUntil: "domcontentloaded",
  });

  const messagesDiv = page.locator("#running_challenges_messages_div");
  await expect(messagesDiv).toHaveText(
    "Additional badges provided by Running Challenges",
    { timeout: 15000 },
  );

  const explorerMap = page.locator("#explorer_map");
  await expect(explorerMap).toHaveCount(1);

  const markers = explorerMap.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible({ timeout: 10000 });
  expect(await markers.count()).toBeGreaterThan(0);
});

let badgesThatShouldExistMap = {
  // Running badges
  "runner-tourist": ["1309364", "482"],
  "runner-name-badge": ["482"],
  // Volunteer badges
  "volunteer-barcode-scanning": ["88720"],
  "volunteer-car-park-marshal": ["88720"],
  "volunteer-close-down": ["88720"],
  "volunteer-comms-person": ["88720"],
  "volunteer-equipment-storage": ["88720"],
  "volunteer-event-day-course-check": ["88720"],
  "volunteer-finish-tokens": ["88720"],
  "volunteer-first-timers-welcome": ["88720"],
  "volunteer-funnel-manager": ["88720"],
  "volunteer-lead-bike": [],
  "volunteer-manual-entry": ["88720"],
  "volunteer-marshal": ["88720"],
  "volunteer-other": ["88720"],
  "volunteer-pacer": ["88720"],
  "volunteer-photographer": ["88720"],
  "volunteer-report-writer": ["88720"],
  "volunteer-results-processing": ["88720"],
  "volunteer-run-director": ["88720"],
  "volunteer-setup": ["88720"],
  "volunteer-sign-language": ["88720"],
  "volunteer-tail-walker": ["88720"],
  "volunteer-timer": ["88720"],
  "volunteer-token-sorting": ["88720"],
  "volunteer-vi-guide": ["88720"],
  "volunteer-volunteer-coordinator": ["88720"],
  "volunteer-warm-up-leader": ["88720"],
  "volunteer-parkwalker": ["88720"],
};

let notApplicableBadgesPerDomain = {
  "parkrun.co.at": ["volunteer-warm-up-leader"],
  "parkrun.pl": ["volunteer-warm-up-leader"],
};

Object.keys(badgesThatShouldExistMap).forEach((badgeShortname) => {
  if (countryDomain in notApplicableBadgesPerDomain) {
    if (notApplicableBadgesPerDomain[countryDomain].includes(badgeShortname)) {
      console.log(`Skipping ${badgeShortname} for ${countryDomain}`);
      return;
    }
  }

  test(`Check for badge awarded: ${badgeShortname}`, async ({ page }) => {
    for (const parkrunnerId of badgesThatShouldExistMap[badgeShortname]) {
      await page.goto(
        `https://www.${countryDomain}/parkrunner/${parkrunnerId}/all/`,
      );

      // Wait for the extension to load, and therefore all the badges to be displayed
      await expect(page.locator("#running_challenges_messages_div")).toHaveText(
        "Additional badges provided by Running Challenges",
        { timeout: 10000 },
      );

      // Check for the specific badge:
      await expect(
        page.locator(`#badge-awarded-${badgeShortname}`),
      ).toBeVisible();
    }
  });
});

// test('get started link', async ({ page }) => {
//   await page.goto('https://playwright.dev/');

//   // Click the get started link.
//   await page.getByRole('link', { name: 'Get started' }).click();

//   // Expects the URL to contain intro.
//   await expect(page).toHaveURL(/.*intro/);
// });
