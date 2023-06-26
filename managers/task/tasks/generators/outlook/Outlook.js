const template = require(`../../template.js`);
const faker = require("faker");
const got = require("got");
const genCipher = require(`./cipher.js`);
const tough = require("tough-cookie");
const password = require("secure-random-password");

module.exports = class Outlook extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
    this.redirect;
    this.uaid;
    this.tcxt;
    this.canary;
    this.randomNum;
    this.key;
    this.SKI;
    this.jar = new tough.CookieJar();
    this.pw = this.genPw();
  }

  async run() {
    await this.createAccount();
  }

  async createAccount() {
    try {
      this.log(`Creating account...`, "info");
      this.email = `${faker.name.firstName()}${faker.name.lastName()}${this.rNum(
        1000,
        999999
      )}`;
      await this.loadSite();
      await this.loadRedirect();
      if (!this.solved) {
        this.postBody = await this.genBody();
      } else {
        this.postBody = await this.getSolvedBody();
        this.solved = null;
      }
      let headers = {
        accept: "application/json",
        "accept-encoding": "gzip, deflate, br",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "no-cache",
        canary: this.canary,
        "content-type": "application/json",
        dnt: "1",
        hpgid: "2006" + this.rNum(10, 99).toString(),
        origin: "https://signup.live.com",
        pragma: "no-cache",
        referer: this.redirect,
        scid: "100118",
        "sec-ch-ua": `" Not A;Brand";v="99", "Chromium";v="96", "Google Chrome";v="96"`,
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": `"Windows"`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        tcxt: this.tcxt,
        uaid: this.uaid,
        uiflvr: "1001",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36",
        "x-ms-apitransport": "xhr",
        "x-ms-apiversion": "2",
      };

      let opts = {
        url: `https://signup.live.com/API/CreateAccount?lic=1&uaid=${this.uaid}`,
        json: this.postBody,
        headers: headers,
        method: "POST",
        cookieJar: this.jar,
        responseType: "json",
      };

      if (this.task.useProxies === true) {
        await this.setProxy();
        opts.agent = {
          https: this.proxyAgent,
        };
      }

      let res = await got(opts);
      let errMsg = res.body.error;
      if (!errMsg || errMsg == undefined) {
        this.log(`Account Successfully Generated`, "success");
        this.saveAccounts({
          email: `${this.email}@outlook.com`,
          site: "Outlook",
          password: this.pw,
        });
        await this.sendWebhook({
          title: `Outlook Account Generated`,
          thumbnail:
            "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
          fields: [
            {
              name: "Site",
              value: "Outlook",
              inline: true,
            },
            {
              name: "Email",
              value: this.email + "@outlook.com",
              inline: true,
            },
            {
              name: "Password",
              value: "||" + this.pw + "||",
              inline: false,
            },
          ],
        });
        this.solved = null;
      } else {
        let errCode = errMsg.code;
        switch (errCode) {
          case "1042":
            this.log("SMS bypass failure, rotating proxies...", "error");
            await this.sleep(5000);
            this.run();
            break;
          case "1041":
            this.log(`Presolving captcha...`, "warn");
            this.encAttemptToken = errMsg.data
              .split(`encAttemptToken":"`)[1]
              .split(`"`)[0]
              .replaceAll(`\\u002f`, "/")
              .replaceAll(`\\u003a`, ":")
              .replaceAll(`\\u002b`, "+")
              .replaceAll(`\\u0026`, "&")
              .replaceAll(`\\u003d`, "=");
            this.dfpRequestId = errMsg.data
              .split(`dfpRequestId":"`)[1]
              .split(`"`)[0];
            this.solved = await this.solveFunCap(
              `https://signup.live.com/signup?lic=1&uaid=${this.uaid}`,
              "B7D8911C-5CC8-A9A3-35B0-554ACEE604DA",
              "https://client-api.arkoselabs.com"
            );
            await this.run();
            break;
          case "1043":
            this.log(
              "Bad Captcha Token - IP temp. banned! - Retrying...",
              "error"
            );
            this.run();
            break;
          default:
            this.log(`Unsupported Code: ${errCode} - Retrying...`, "error");
            this.run();
            break;
        }
      }
    } catch (e) {
      this.log(e.message + " - retrying in 5s...", "error");
      await this.sleep(5000);
      this.run();
    }
  }

  async loadSite() {
    let opts = {
      url: "https://signup.live.com/signup",
      cookieJar: this.jar,
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      opts.agent = {
        https: this.proxyAgent,
      };
    }
    let res = await got.get(opts);
    this.redirect = res.request.options.url.href;
  }

  async loadRedirect() {
    let opts = {
      url: this.redirect,
      cookieJar: this.jar,
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      opts.agent = {
        https: this.proxyAgent,
      };
    }
    let res = await got.get(opts);

    let body = res.body;
    this.uaid = this.redirect.split("uaid=")[1].split("&")[0];
    let tcxt = body
      .split('"clientTelemetry":{"uaid":"')[1]
      .split(',"tcxt":"')[1]
      .split('"},')[0];
    this.tcxt = tcxt;
    let canary = body.split('"apiCanary":"')[1].split('"')[0];
    this.canary = canary
      .replaceAll(`\\u002f`, "/")
      .replaceAll(`\\u003a`, ":")
      .replaceAll(`\\u0026`, "&")
      .replaceAll(`\\u003d`, "=")
      .replaceAll(`\\u002b`, "+");
    this.randomNum = body.split(`var randomNum="`)[1].split(`"`)[0];
    this.key = body.split(`var Key="`)[1].split(`"`)[0];
    this.SKI = body.split(`var SKI="`)[1].split(`"`)[0];
  }

  rNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  genPw() {
    let pw = password.randomPassword({
      characters: [password.lower, password.upper, password.digits],
    });
    pw = pw.slice(0, pw.length - 5);
    let num = this.rNum(1000, 9999);
    pw = pw + "!" + num.toString();
    pw += "Aa";
    return pw;
  }

  async getCipher() {
    let cipher = await genCipher(
      "",
      "",
      "newpwd",
      this.pw,
      this.randomNum,
      this.key
    );
    return cipher;
  }

  async genBody() {
    let ts = new Date();
    this.cipher = await this.getCipher();
    let body = {
      RequestTimeStamp: ts,
      MemberName: `${this.email}@outlook.com`,
      CheckAvailStateMap: [`${this.email}@outlook.com:undefined`],
      EvictionWarningShown: [],
      UpgradeFlowToken: {},
      FirstName: faker.name.firstName(),
      LastName: faker.name.lastName(),
      MemberNameChangeCount: 1,
      MemberNameAvailableCount: 1,
      MemberNameUnavailableCount: 0,
      CipherValue: this.cipher,
      SKI: this.SKI,
      BirthDate: "01:01:1990",
      Country: "US",
      IsOptOutEmailDefault: false,
      IsOptOutEmailShown: true,
      IsOptOutEmail: true,
      LW: true,
      SiteId: "292841",
      IsRDM: 0,
      WReply: null,
      ReturnUrl: null,
      SignupReturnUrl: null,
      uiflvr: 1001,
      uaid: this.uaid,
      SuggestedAccountType: "OUTLOOK",
      SuggestionType: "Locked",
      //"HFId":"9a166ed80043424d883dafb778efec5d",
      encAttemptToken: "",
      dfpRequestId: "",
      scid: 100118,
      hpgid: 200650,
    };

    return body;
  }

  async getSolvedBody() {
    let ts = new Date();
    this.cipher = await this.getCipher();
    let body = {
      RequestTimeStamp: ts,
      MemberName: `${this.email}@outlook.com`,
      CheckAvailStateMap: [`${this.email}@outlook.com:undefined`],
      EvictionWarningShown: [],
      UpgradeFlowToken: {},
      FirstName: faker.name.firstName(),
      LastName: faker.name.lastName(),
      MemberNameChangeCount: 1,
      MemberNameAvailableCount: 1,
      MemberNameUnavailableCount: 0,
      CipherValue: this.cipher,
      SKI: this.SKI,
      BirthDate: "01:01:1990",
      Country: "US",
      IsOptOutEmailDefault: false,
      IsOptOutEmailShown: true,
      IsOptOutEmail: true,
      LW: true,
      SiteId: "68692",
      IsRDM: 0,
      WReply: null,
      ReturnUrl: null,
      SignupReturnUrl: null,
      uiflvr: 1001,
      uaid: this.uaid,
      SuggestedAccountType: "EASI",
      SuggestionType: "Prefer",
      //"HFId":"405de830c1434978bfe8f047e6dca9dc",
      HType: "enforcement",
      HSol: this.solved,
      HPId: "B7D8911C-5CC8-A9A3-35B0-554ACEE604DA",
      encAttemptToken: this.encAttemptToken,
      dfpRequestId: this.dfpRequestId,
      scid: 100118,
      hpgid: 201040,
    };
    return body;
  }

  log(message, type) {
    global.logThis(
      `[${this.task.module}] -- [${this.task.captchaSolver}] -- ${message}`,
      type
    );
  }
};
