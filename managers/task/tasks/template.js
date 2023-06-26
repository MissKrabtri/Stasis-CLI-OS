const Captcha = require("2captcha");
const CapSolver = require("capsolver-npm");
const {
  RecaptchaV2Task,
  FuncaptchaTask,
  HCaptchaTask,
} = require("node-capmonster");
const {
  checkFileExists,
  sendWebhook,
  getRandomProxy,
} = require(`../../utils.js`);
const fs = require("fs").promises;
const path = require("path");
const password = require("secure-random-password");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { HttpsProxyAgent } = require("https-proxy-agent");

module.exports = class Template {
  constructor(task) {
    this.task = task;
    this.config = config.get("stasis-cli");
  }

  log(message, type) {
    global.logThis(`[${this.task.module}] -- ${message}`, type);
  }

  async startTask() {
    this.run();
  }

  async stopTask() {
    //
  }

  sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async solve2Cap(siteKey, url) {
    let capToken;
    if (this.task.captchaSolver === "2Captcha") {
      if (
        this.config.captcha.twocaptcha &&
        this.config.captcha.twocaptcha !== ""
      ) {
        this.captcha_solver = new Captcha.Solver(
          this.config.captcha.twocaptcha
        );

        let res = await this.captcha_solver.recaptcha(siteKey, url, {
          retries: 10,
        });
        capToken = res.data;
      } else {
        this.log("No 2Captcha API key set", "error");
      }
    } else if (this.task.captchaSolver === "CapMonster") {
      this.captcha_solver = new RecaptchaV2Task(this.config.captcha.capmonster);
      const task = this.captcha_solver.task({
        websiteKey: siteKey,
        websiteURL: url,
      });
      const taskId = await this.captcha_solver.createWithTask(task);
      const result = await this.captcha_solver.joinTaskResult(taskId);
      capToken = result.gRecaptchaResponse;
    } else if (this.task.captchaSolver === "CapSolver") {
      this.captcha_solver = new CapSolver(this.config.captcha.capsolver, 0);
      let b = await this.captcha_solver.balance();
      if (b > 0) {
        let res = await this.captcha_solver.recaptchav2proxyless(
          url,
          siteKey,
          null,
          null
        );
        capToken = res.solution.gRecaptchaResponse;
      } else {
        this.log("Add funds to CapSolver to use the service.", "error");
      }
    }

    return capToken;
  }

  async solveFunCap(url, siteKey, jsUrl) {
    let capToken;
    if (this.task.captchaSolver === "2Captcha") {
      this.captcha_solver = new Captcha.Solver(this.config.captcha.twocaptcha);
      let capData = await this.captcha_solver.funCaptcha(siteKey, url, jsUrl);
      capToken = capData.data;
    } else if (this.task.captchaSolver === "CapMonster") {
      this.captcha_solver = new FuncaptchaTask(this.config.captcha.capmonster);
      let task = this.captcha_solver.task({
        websiteURL: url,
        websitePublicKey: siteKey,
        funcaptchaApiJSSubdomain: jsUrl,
      });
      let taskId = await this.captcha_solver.createWithTask(task);
      let result = await this.captcha_solver.joinTaskResult(taskId);
      capToken = result.gRecaptchaResponse;
    } else if (this.task.captchaSolver === "CapSolver") {
      this.captcha_solver = new CapSolver(this.config.captcha.capsolver, 0);
      let b = await this.captcha_solver.balance();
      if (b > 0) {
        let res = await this.captcha_solver.funcaptchaproxyless(
          url,
          siteKey,
          jsUrl,
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36",
          null
        );
        if (res.solution && res.solution.token) {
          capToken = res.solution.token;
        } else {
          throw new Error(
            "Response from CapSolver API: " + res.apiResponse.errorDescription
          );
        }
      } else {
        this.log("Add funds to CapSolver to use the service.", "error");
      }
    }

    return capToken;
  }

  async solveHcap(siteKey, url) {
    let capToken;
    if (this.task.captchaSolver === "2Captcha") {
      if (
        this.config.captcha.twocaptcha &&
        this.config.captcha.twocaptcha !== ""
      ) {
        this.captcha_solver = new Captcha.Solver(
          this.config.captcha.twocaptcha
        );
        let res = await this.captcha_solver.hcaptcha(siteKey, url);
        capToken = res.data;
      } else {
        this.log("No 2Captcha API key set", "error");
      }
    } else if (this.task.captchaSolver === "CapMonster") {
      this.captcha_solver = new HCaptchaTask(this.config.captcha.capmonster);
      const task = this.captcha_solver.task({
        websiteKey: siteKey,
        websiteURL: url,
      });
      const taskId = await this.captcha_solver.createWithTask(task);
      const result = await this.captcha_solver.joinTaskResult(taskId);
      capToken = result.gRecaptchaResponse;
    } else if (this.task.captchaSolver === "CapSolver") {
      this.captcha_solver = new CapSolver(this.config.captcha.capsolver, 0);
      let b = await this.captcha_solver.balance();
      if (b > 0) {
        let res = await this.captcha_solver.hcaptchaproxyless(
          url,
          siteKey,
          null,
          null
        );
        if (!res.solution) {
          throw new Error(
            "Response from  API: " + res.apiResponse.errorDescription
          );
        }
        capToken = res.solution.gRecaptchaResponse;
      } else {
        this.log("Add funds to CapSolver to use the service.", "error");
      }
    }
    return capToken;
  }

  async saveAccounts(obj) {
    let contents;
    let fileExists = await checkFileExists(
      path.join(process.cwd(), "accounts", "generated.json")
    );
    if (!fileExists) {
      contents = await fs.writeFile(
        path.join(process.cwd(), "accounts", "generated.json"),
        JSON.stringify({ accounts: [] }, null, 2)
      );
    } else {
      contents = await fs.readFile(
        path.join(process.cwd(), "accounts", "generated.json"),
        "utf-8"
      );
    }
    let json = JSON.parse(contents);
    json.accounts.push(obj);
    await fs.writeFile(
      path.join(process.cwd(), "accounts", "generated.json"),
      JSON.stringify(json, null, 2)
    );
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

  rNum(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  async getImap() {
    let found = this.config.imap.find((x) => x.email === this.task.imap);
    if (found) {
      this.imapConfig = {
        provider: found.provider,
        email: found.email,
        password: found.password,
      };
    } else {
      throw new Error("Failed to fetch selected IMAP configuration.");
    }
  }

  async sendWebhook(obj) {
    try {
      let saved = this.config.webhooks;
      if (saved.length > 0) {
        for (let hook of saved) {
          obj.hookURL = hook;
          await sendWebhook(obj);
        }
      }
    } catch (e) {
      // Do nothing
    }
  }

  async setProxy() {
    this.proxy = await getRandomProxy();
    this.proxyAgent = new HttpsProxyAgent(this.proxy);
    return;
  }
};
