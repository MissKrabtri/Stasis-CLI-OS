const template = require(`../../template.js`);
const faker = require("faker");
const got = require("got");
const moment = require("moment");
const Conf = require("conf");
const config = new Conf("stasis-cli");

module.exports = class CPK extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
    this.config = config.get("stasis-cli");
  }

  async run() {
    try {
      this.log("Getting deal...", "info");
      await this.createAccount();
      this.log("Deal Claimed! Check your master email.", "success");
      await this.saveAccounts({
        site: "California Pizza Kitchen",
        email: this.email,
        password: this.password,
      });
    } catch (e) {
      this.log(e.message, "error");
    }
  }

  async createAccount() {
    let first = faker.name.firstName();
    let last = faker.name.lastName();
    let email = first + last + "@" + this.task.catchall;
    this.email = email;
    this.password = this.genPw();
    let reqConfig = {
      method: "POST",
      url: "https://api.cpk.com/api/v1.0/users/create",
      headers: {
        authority: "api.cpk.com",
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "content-type": "application/json",
        origin: "https://www.cpk.com",
        referer: "https://www.cpk.com/",
      },
      json: {
        authentication: "anonymous",
        merchantId: 52,
        cardTemplateCode: 1,
        activationStoreCode: "pxweb",
        enforceUniqueFields: ["mobilePhone", "email"],
        setUserFields: {
          style: "typed",
          optIn: true,
          email: [this.email],
          password: [this.password],
          firstName: [first],
          lastName: [last],
          dateOfBirth: [
            `1990-${moment().format("MM")}-${moment().format("DD")}`,
          ],
          mobilePhone: [faker.phone.phoneNumberFormat()],
          username: [email],
        },
        setAccountFields: { style: "typed", favoriteStore: [{ code: `100` }] },
      },
      responseType: "json",
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      reqConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let { body } = await got(reqConfig);
    await this.sendWebhook({
      title: `California Pizza Kitchen - Deal Claimed`,
      description: "It may take up to 24 hours for the deal to be sent to you",
      color: "#1155EF",
      thumbnail:
        "https://upload.wikimedia.org/wikipedia/en/7/75/Californiapizzakitchenlogo.png?20210805234840",
      fields: [
        {
          name: "Module",
          value: "California Pizza Kitchen",
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
          value: `|| ${this.password} ||`,
          inline: false,
        },
      ],
    });
    return;
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module}] -- [${this.task.catchall}] -- ${message}`,
      type
    );
  }
};
