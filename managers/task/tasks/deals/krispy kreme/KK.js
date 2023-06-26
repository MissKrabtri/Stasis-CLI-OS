const template = require(`../../template.js`);
const { CookieJar } = require("tough-cookie");
const faker = require("faker");
const UserAgent = require("user-agents");
const cheerio = require("cheerio");
const qs = require("qs");
const got = require("got");
const Conf = require("conf");
const config = new Conf("stasis-cli");

module.exports = class KK extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
    this.cookieJar = new CookieJar();
    this.config = config.get("stasis-cli");
  }

  async run() {
    try {
      this.log("Presolving...", "warn");
      let capToken = await this.solve2Cap(
        "6Lc4iwIaAAAAAHpijD7fQ_rJIdWZtvpodAsPt8AA",
        "https://www.krispykreme.com/account/create-account"
      );
      if (capToken) {
        this.log("Solved captcha, continuing...", "info");
        this.userAgent = await this.getUserAgent();
        this.log("Getting session...", "info");
        await this.getSession();
        this.log("Parsing values...", "info");
        await this.parseRegisterValues();
        this.log("Creating account...", "info");
        await this.createAccount(capToken);
        this.log("Deal Claimed! Check your master email.", "success");
        await this.saveAccounts({
          site: "Krispy Kreme",
          email: this.email,
          password: this.password,
        });
        await this.sendWebhook({
          title: `Krispy Kreme Deal Claimed`,
          description:
            "It may take up to 24 hours for the deal to be sent to you",
          thumbnail:
            "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
          fields: [
            {
              name: "Module",
              value: "Krispy Kreme",
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
      } else {
        this.log("Failed to solve captcha, retrying...", "error");
        await this.sleep(2500);
        await this.run();
      }
    } catch (e) {
      this.log(e.message, "error");
    }
  }

  async getSession() {
    let res = await this.request({
      method: "GET",
      cookieJar: this.cookieJar,
      url: "https://www.krispykreme.com/account/create-account",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:103.0) Gecko/20100101 Firefox/103.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Connection: "keep-alive",
        Referer: "https://www.krispykreme.com/account/sign-in",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        TE: "trailers",
      },
    });
    return;
  }

  async parseRegisterValues() {
    let res = await this.request({
      url: `https://www.krispykreme.com/account/create-account`,
      method: "GET",
      headers: {
        Connection: "keep-alive",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "Upgrade-Insecure-Requests": "1",
        "User-Agent": this.userAgent,
        Accept: "*/*",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
        referer: "https://www.krispykreme.com/account/create-account",
      },
      cookieJar: this.cookieJar,
    });
    const $ = cheerio.load(res.body);
    this.csrfToken = $(`input[name="__CMSCsrfToken"]`).attr("value");
    this.viewState = $(`input[name="__VIEWSTATE"]`).attr("value");
    this.viewStateGenerator = $(`input[name="__VIEWSTATEGENERATOR"]`).attr(
      "value"
    );
    this.eventValidation = $(`input[name="__EVENTVALIDATION"]`).attr("value");
    return;
  }

  async createAccount(capToken) {
    let phone = faker.phone.phoneNumber().replaceAll(".", "-").toString();
    let firstName = faker.name.firstName();
    let lastName = faker.name.lastName();
    this.email = `${firstName}${lastName}@${this.task.catchall}`;
    this.password = this.genPw();
    let res = await this.request({
      cookieJar: this.cookieJar,
      body: qs.stringify({
        __CMSCsrfToken: this.csrfToken,
        __EVENTTARGET: "",
        __EVENTARGUMENT: "",
        __VIEWSTATE: this.viewState,
        lng: "en-US",
        __VIEWSTATEGENERATOR: this.viewStateGenerator,
        __EVENTVALIDATION: this.eventValidation,
        ctl00$hdnUserId: "",
        ctl00$plcMain$txtFirstName: firstName,
        ctl00$plcMain$txtLastName: lastName,
        ctl00$plcMain$ddlBirthdayMM: "08",
        ctl00$plcMain$ddlBirthdayDD: "19",
        ctl00$plcMain$txtZipCode: "06010",
        ctl00$plcMain$ucPhoneNumber$txt1st: "960",
        ctl00$plcMain$ucPhoneNumber$txt2nd: "892",
        ctl00$plcMain$ucPhoneNumber$txt3rd: "8118",
        ctl00$plcMain$txtEmail: this.email,
        ctl00$plcMain$txtPassword: this.password,
        ctl00$plcMain$confirmPasswordTxt: this.password,
        ctl00$plcMain$cbTermsOfUse: "on",
        "g-recaptcha-response": capToken.toString(),
        ctl00$plcMain$btnSubmit: "Sign+Up",
      }),
      url: `https://www.krispykreme.com/account/create-account`,
      method: "POST",
      headers: {
        Connection: "keep-alive",
        "content-type": "application/x-www-form-urlencoded",
        "Upgrade-Insecure-Requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        Accept: "*",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        Referer: `https://www.krispykreme.com/account/create-account`,
        "Accept-Encoding": "gzip, deflate, br",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    return;
  }

  async getUserAgent() {
    return new UserAgent({ platform: "Win32" }).data.userAgent;
  }

  async request(options) {
    options.timeout = 30000;
    if (this.task.useProxies === true) {
      await this.setProxy();
      options.agent = {
        https: this.proxyAgent,
      };
    }
    let res = await got(options);
    return res;
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module}] -- [${this.task.catchall} (${this.task.captchaSolver})] -- ${message}`,
      type
    );
  }
};
