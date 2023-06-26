const template = require(`../../template.js`);
const faker = require("faker");
const got = require("got");
const qs = require("qs");

module.exports = class Shopify extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      this.log(e.message + " - retrying in 5s...", "error");
      await this.sleep(5000);
      this.run();
    }
  }

  async createAccount() {
    try {
      this.log("Creating account...", "info");
      let first = faker.name.firstName();
      let last = faker.name.lastName();
      this.email = `${first}${last}@${this.task.catchall}`;
      this.password = this.genPw();
      let reqConfig = {
        method: "POST",
        url: `${this.task.site}/account`,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Content-Type": "application/x-www-form-urlencoded",
          Origin: `https://${this.task.site}`,
          "Alt-Used": `${this.task.site}`,
          Connection: "keep-alive",
          Referer: `https://${this.task.site}/account/register`,
          "Upgrade-Insecure-Requests": "1",
          TE: "trailers",
        },
        body: qs.stringify({
          form_type: "create_customer",
          utf8: "✓",
          "customer[first_name]": first,
          "customer[last_name]": last,
          "customer[email]": this.email,
          "customer[password]": this.password,
        }),
        followRedirect: false,
      };
      if (this.task.useProxies === true) {
        await this.setProxy();
        reqConfig.agent = {
          https: this.proxyAgent,
        };
      }
      let res = await got(reqConfig);
      this.log("Account created!", "success");
      await this.saveAccounts({
        email: this.email,
        site: `${this.task.site} (Shopify)`,
        password: this.password,
      });
      await this.sendWebhook({
        title: `Shopify Account Generated`,
        thumbnail:
          "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
        url: this.task.site,
        fields: [
          {
            name: "Site",
            value: this.task.site + " (Shopify)",
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
    } catch (e) {
      // this.log(e.message, "error");
      this.log("Connection error, retrying in 5s...", "error");
      await this.sleep(5000);
      this.createAccount();
    }
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module}] -- [${this.task.site}] -- [${this.task.catchall}] -- ${message}`,
      type
    );
  }
};
