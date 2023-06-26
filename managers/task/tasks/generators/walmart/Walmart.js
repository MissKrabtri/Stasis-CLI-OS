const faker = require("faker");
const got = require("got");
const template = require(`../../template.js`);

module.exports = class Walmart extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      if (e.response) {
        if (e.response.statusCode === 412) {
          this.log("Soft banned, retrying in 5s...", "error");
          await this.sleep(5000);
          this.run();
        } else {
          this.log(e.message + " - retrying in 5s...", "error");
          await this.sleep(5000);
          this.run();
        }
      } else {
        this.log(e.message + " - retrying in 5s", "error");
        await this.sleep(5000);
        this.run();
      }
    }
  }

  getRandom(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  async createAccount() {
    this.log("Creating account...", "info");
    let first = faker.name.firstName();
    let last = faker.name.lastName();
    let email = `${first}${last}${this.getRandom(999, 9999)}@${
      this.task.catchall
    }`;
    this.email = email;
    this.password = this.genPw();
    let browserConfig = {
      url: "https://www.walmart.com/account/electrode/api/signup?ref=domain",
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) Gecko/20100101 Firefox/91.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://www.walmart.com/account/signup?vid=oaoh&ref=domain",
        "content-type": "application/json",
        DEVICE_PROFILE_REF_ID: "o6ku-eYU3GC84EkeJo6s5kMQEh35VzjlebBC",
        Origin: "https://www.walmart.com",
        Connection: "keep-alive",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      body: JSON.stringify({
        personName: {
          firstName: first,
          lastName: last,
        },
        email: email,
        password: this.password,
        rememberme: true,
        emailNotificationAccepted: true,
        captcha: {
          sensorData: "",
        },
      }),
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      browserConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let { body } = await got(browserConfig);
    this.log("Account generated!", "success");
    await this.saveAccounts({
      email: this.email,
      site: "Walmart",
      password: this.password,
    });
    await this.sendWebhook({
      title: `Walmart Account Generated`,
      thumbnail:
        "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
      fields: [
        {
          name: "Site",
          value: "Walmart",
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
          inline: false,
        },
      ],
    });
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module} US] -- [${this.task.catchall}] -- ${message}`,
      type
    );
  }
};
