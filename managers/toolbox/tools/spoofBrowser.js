const { chromium, firefox } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth");
const LocateChrome = require("locate-chrome");
chromium.use(stealth());

module.exports = class SpoofBrowser {
  constructor(browser, url, useProxies, id) {
    this.id = id;
    this.browserType = browser;
    this.url = url;
    this.useProxies = useProxies;
  }

  async launch() {
    this.log(`Launching ${this.browserType}...`, "info");
    let browserPath;
    let browserConfig;
    if (this.browserType === "Chrome") {
      browserPath = await LocateChrome();
      browserConfig = {
        headless: false,
        ignoreHTTPSErrors: true,
        defaultViewport: { width: 1366, height: 768 },
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        executablePath: browserPath,
      };
      this.browser = await chromium.launch(browserConfig);
    } else {
      browserConfig = {
        headless: false,
        ignoreHTTPSErrors: true,
        defaultViewport: { width: 1366, height: 768 },
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      };
      this.browser = await firefox.launch(browserConfig);
    }
    this.log(`${this.browserType} launched!`, "success");
    let page = await this.browser.newPage({
      colorScheme: "dark",
      javaScriptEnabled: true,
    });
    await page.goto(this.url);
  }

  log(message, type) {
    global.logThis(
      `[Spoof Browser] --- [${this.id
        .slice(0, 4)
        .toUpperCase()}] ---> ${message} [${this.url}]`,
      type
    );
  }
};
