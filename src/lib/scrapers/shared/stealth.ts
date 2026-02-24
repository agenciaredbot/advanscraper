import { chromium, type Browser, type BrowserContext, type LaunchOptions } from "playwright";
import { getRandomUserAgent } from "./user-agents";

// Random viewport sizes to avoid fingerprinting
const VIEWPORTS = [
  { width: 1920, height: 1080 },
  { width: 1366, height: 768 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1600, height: 900 },
];

function getRandomViewport() {
  return VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];
}

export interface StealthBrowserOptions {
  headless?: boolean;
  proxy?: { server: string; username?: string; password?: string };
}

/**
 * Launch a stealth Chromium browser with anti-detection measures
 */
export async function launchStealthBrowser(
  options: StealthBrowserOptions = {}
): Promise<{ browser: Browser; context: BrowserContext }> {
  const viewport = getRandomViewport();
  const userAgent = getRandomUserAgent();

  const launchOptions: LaunchOptions = {
    headless: options.headless ?? true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
    ],
  };

  if (options.proxy) {
    launchOptions.proxy = options.proxy;
  }

  const browser = await chromium.launch(launchOptions);

  const context = await browser.newContext({
    userAgent,
    viewport,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    geolocation: { latitude: 4.711, longitude: -74.0721 },
    permissions: ["geolocation"],
    javaScriptEnabled: true,
  });

  // Stealth: override navigator.webdriver
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", {
      get: () => undefined,
    });

    // Override plugins
    Object.defineProperty(navigator, "plugins", {
      get: () => [1, 2, 3, 4, 5],
    });

    // Override languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["es-CO", "es", "en-US", "en"],
    });

    // Override chrome
    (window as unknown as Record<string, unknown>).chrome = {
      runtime: {},
    };
  });

  return { browser, context };
}
