const template = require(`../../template.js`);
const faker = require("faker");
const LocateChrome = require("locate-chrome");
const puppeteer = require("puppeteer-extra");
const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth");
const inbox = require("inbox");
const { simpleParser } = require("mailparser");
const cheerio = require("cheerio");
puppeteer.use(stealth());
chromium.use(stealth());

module.exports = class eBay extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
    this.browser = null;
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      this.log(`${e.message}`, "error");
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
    }
  }

  async createAccount() {
    this.log(`Creating session...`, "info");
    let browserConfig = {
      headless: true,
      executablePath: await LocateChrome(),
      ignoreHTTPSErrors: true,
      defaultViewport: { width: 1366, height: 768 },
      args: ["--no-sandbox"],
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      browserConfig.args.push(`--proxy-server=${this.proxy}`);
    }
    this.browser = await chromium.launch(browserConfig);
    let page = await this.browser.newPage();
    this.log(`Generating...`, "info");
    await page.goto("https://ebay.com");
    await page.goto("https://signup.ebay.com/pa/crte");
    await page.waitForSelector("#firstname");
    let firstName = faker.name.firstName();
    let lastName = faker.name.lastName();
    let email = firstName + lastName + "@" + this.task.catchall;
    this.email = email;
    this.password = this.genPw();
    // TODO: Add IMAP
    await this.getImap();
    await this.listenInbox(page, firstName, lastName, this.email);
    await page.type("#firstname", firstName);
    await page.type("#lastname", lastName);
    await page.type("#Email", this.email);
    await page.type("#password", this.password);
    await page.waitForTimeout(5000);
    await page.click("#EMAIL_REG_FORM_SUBMIT");
  }

  genNum() {
    return Math.floor(Math.random() * 99999);
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module} US] -- [${this.task.catchall}] -- ${message}`,
      type
    );
  }

  async listenInbox(page, first, last, mail) {
    let client = inbox.createConnection(false, this.imapConfig.provider, {
      secureConnection: true,
      auth: {
        user: this.imapConfig.email,
        pass: this.imapConfig.password,
      },
    });
    client.connect();
    client.on("connect", () => {
      this.log("Waiting for code....");
      client.openMailbox("INBOX", async (error, info) => {
        client.on("new", async (message) => {
          if (
            message.from.address === "eBay@ebay.com" &&
            message.to.length > 0 &&
            message.to[0].address === mail
          ) {
            const messageStream = client.createMessageStream(message.UID);
            let parsed = await simpleParser(messageStream);
            let html = parsed.html;
            if (parsed.subject.includes("Your eBay security code")) {
              let $ = cheerio.load(html);
              let bodyText = $("body").text();
              let codeMatch = bodyText.match(/\b\d{6}\b/);
              let code = codeMatch[0];
              this.log(`Got code: ${code}`, "info");
              this.code = code;
              client.close();
              await page.type("#pinbox-0", code.split("")[0]);
              await page.type("#pinbox-1", code.split("")[1]);
              await page.type("#pinbox-2", code.split("")[2]);
              await page.type("#pinbox-3", code.split("")[3]);
              await page.type("#pinbox-4", code.split("")[4]);
              await page.type("#pinbox-5", code.split("")[5]);
              await page.waitForTimeout(5000);
              let homeHtml = await page.content();
              if (homeHtml.includes("gh-tb ui-autocomplete-input")) {
                this.log(`Account generated!`, "success");
                await this.browser.close();
                this.browser = null;
                await this.saveAccounts({
                  email: this.email,
                  site: "eBay",
                  password: this.password,
                });
                await this.sendWebhook({
                  title: `eBay Account Generated`,
                  thumbnail:
                    "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
                  fields: [
                    {
                      name: "Site",
                      value: "eBay",
                      inline: true,
                    },
                    {
                      name: "Catchall",
                      value: this.task.catchall,
                      inline: true,
                    },
                    {
                      name: "Email",
                      value: this.email,
                      inline: false,
                    },
                    {
                      name: "Password",
                      value: "||" + this.password + "||",
                      inline: true,
                    },
                  ],
                });
              } else {
                this.log(
                  `Failed to confirm account - manual check suggested!`,
                  "warn"
                );
              }
            }
          }
        });
      });
    });
  }
};
