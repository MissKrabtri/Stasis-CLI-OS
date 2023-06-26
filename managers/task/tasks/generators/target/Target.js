const template = require(`../../template.js`);
const faker = require("faker");
const LocateChrome = require("locate-chrome");
const puppeteer = require("puppeteer-extra");
const stealth = require("puppeteer-extra-plugin-stealth");
puppeteer.use(stealth());

module.exports = class Target extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      this.log(e.message + " - retrying in 10s...", "error");
      if (this.browser) {
        await this.browser.close();
      }

      await this.sleep(10000);
      this.run();
    }
  }

  async createAccount() {
    this.log(`Generating account...`, "info");
    let first = faker.name.firstName();
    let last = faker.name.lastName();
    this.email = `${first}${last}@${this.task.catchall}`;
    this.password = this.genPw();
    let browserConfig = {
      headless: "new",
      ignoreHTTPSErrors: true,
      defaultViewport: { width: 1366, height: 768 },
      args: ["--no-sandbox"],
      executablePath: await LocateChrome(),
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      browserConfig.args.push(`--proxy-server=${this.proxy}`);
    }
    this.browser = await puppeteer.launch(browserConfig);
    let page = await this.browser.newPage();
    await page.goto("https://www.target.com");
    await page.waitForSelector(".styles__LinkText-sc-u2k6h-3");
    await page.click(".styles__LinkText-sc-u2k6h-3");
    await page.waitForSelector('a[data-test="accountNav-createAccount"]');
    await page.click('a[data-test="accountNav-createAccount"]');
    await page.waitForSelector("#username");
    await page.type("#username", this.email);
    await page.type("#firstname", first);
    await page.type("#lastname", last);
    await page.type("#password", this.password);
    await page.click("#createAccount");
    await page.waitForSelector("#circle-skip");
    await page.click("#circle-skip");
    await page.waitForTimeout(5 * 1000);
    await this.browser.close();
    this.log(`Account generated!`, "success");
    await this.sendWebhook({
      title: `Target Account Generated`,
      thumbnail:
        "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
      fields: [
        {
          name: "Site",
          value: "Target",
          inline: true,
        },
        {
          name: "Catchall",
          value: this.task.catchall,
          inline: true,
        },
        {
          name: "Email",
          value: `${first}${last}@${this.task.catchall}`,
          inline: false,
        },
        {
          name: "Password",
          value: "||" + this.password + "||",
          inline: true,
        },
      ],
    });
    await this.saveAccounts({
      email: this.email,
      site: "Target",
      password: this.password,
    });

    await this.browser.close();
    this.browser = null;
  }

  log(message, type) {
    global.logThis(
      `[Target Account Generator] -- [${this.task.catchall}] -- ${message}`,
      type
    );
  }
};
