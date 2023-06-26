const template = require(`../../template.js`);
const faker = require("faker");
const got = require("got");
const { CookieJar } = require("tough-cookie");
const inbox = require("inbox");
const { simpleParser } = require("mailparser");

module.exports = class Twitter extends template {
  constructor(socket, id, task) {
    super(socket, id, task);
    this.cookieJar = new CookieJar();
  }

  async run() {
    try {
      await this.createAccount();
    } catch (e) {
      this.log(e.message + " - retrying in 10s...", "error");
      await this.sleep(10000);
      this.run();
    }
  }

  async createAccount() {
    this.firstName = faker.name.firstName();
    this.lastName = faker.name.lastName();
    this.email = this.firstName + this.lastName + "@" + this.task.catchall;
    this.password = this.genPw();
    // SOLVE FUNCAPTCHA
    this.log(`Presolving funCaptcha...`, "warn");
    this.funcaptchaToken = await this.solveFunCap(
      "https://twitter.com/i/flow/signup",
      "2CB16598-CB82-4CF7-B332-5990DB66F3AB",
      "https://client-api.arkoselabs.com"
    );
    this.log(`Presolved funCaptcha - token extracted!`, "warn");
    //
    // LOGIN TO IMAP
    this.log(`Launching IMAP...`, "info");
    await this.getImap();
    await this.loginImap();
    //
    // FETCH GUEST TOKEN
    this.log(`Generating guest token...`, "info");
    this.guestToken = await this.genGuestToken();
    this.log(`Generated guest token!`, "info");

    // START SIGN UP FLOW
    let flowRes = await this.startSignupFlow();
    this.flowToken = flowRes.flow_token;
    this.log(`Submitting email...`, "info");
    await this.beginVerify();
    this.log("Submitted email!", "info");
    this.log(`Waiting for verification email...`, "info");
  }

  async genGuestToken() {
    let reqConfig = {
      method: "POST",
      url: "https://api.twitter.com/1.1/guest/activate.json",
      cookieJar: this.cookieJar,
      headers: {
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      },
      json: {},
      responseType: "json",
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      reqConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let { body } = await got(reqConfig);
    return body.guest_token;
  }

  async startSignupFlow() {
    let reqConfig = {
      method: "POST",
      cookieJar: this.cookieJar,
      url: "https://api.twitter.com/1.1/onboarding/task.json?flow_name=signup",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Referer: "https://twitter.com/",
        "x-guest-token": this.guestToken,
        "x-twitter-client-language": "en",
        "x-twitter-active-user": "yes",
        Origin: "https://twitter.com",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        Connection: "keep-alive",
        TE: "trailers",
      },
      json: {
        input_flow_data: {
          flow_context: {
            debug_overrides: {},
            start_location: {
              location: "manual_link",
            },
          },
        },
        subtask_versions: {
          action_list: 2,
          alert_dialog: 1,
          app_download_cta: 1,
          check_logged_in_account: 1,
          choice_selection: 3,
          contacts_live_sync_permission_prompt: 0,
          cta: 7,
          email_verification: 2,
          end_flow: 1,
          enter_date: 1,
          enter_email: 2,
          enter_password: 5,
          enter_phone: 2,
          enter_recaptcha: 1,
          enter_text: 5,
          enter_username: 2,
          generic_urt: 3,
          in_app_notification: 1,
          interest_picker: 3,
          js_instrumentation: 1,
          menu_dialog: 1,
          notifications_permission_prompt: 2,
          open_account: 2,
          open_home_timeline: 1,
          open_link: 1,
          phone_verification: 4,
          privacy_options: 1,
          security_key: 3,
          select_avatar: 4,
          select_banner: 2,
          settings_list: 7,
          show_code: 1,
          sign_up: 2,
          sign_up_review: 4,
          tweet_selection_urt: 1,
          update_users: 1,
          upload_media: 1,
          user_recommendations_list: 4,
          user_recommendations_urt: 1,
          wait_spinner: 3,
          web_modal: 1,
        },
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

    return body;
  }

  async beginVerify() {
    let reqConfig = {
      cookieJar: this.cookieJar,
      method: "POST",
      url: "https://twitter.com/i/api/1.1/onboarding/begin_verification.json",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Referer: "https://twitter.com/i/flow/signup",
        "x-guest-token": this.guestToken,
        "x-twitter-client-language": "en",
        "x-twitter-active-user": "yes",
        Origin: "https://twitter.com",
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      },
      json: {
        email: this.email,
        display_name: `${this.firstName} ${this.lastName}`,
        flow_token: this.flowToken,
      },
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      reqConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let { body } = await got(reqConfig);

    return;
  }

  async submitDetails(code) {
    this.log(`Submitting code: ${code}`, "info");
    let reqConfig = {
      cookieJar: this.cookieJar,
      method: "POST",
      url: "https://twitter.com/i/api/1.1/onboarding/task.json",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Referer: "https://twitter.com/",
        "x-guest-token": `${this.guestToken}`,
        "x-twitter-client-language": "en",
        "x-twitter-active-user": "yes",
        Origin: "https://twitter.com",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
        Connection: "keep-alive",
        TE: "trailers",
      },
      json: {
        flow_token: this.flowToken,
        subtask_inputs: [
          {
            subtask_id: "Signup",
            sign_up: {
              js_instrumentation: {
                response:
                  '{"rf":{"b19b38ba274837457b43a9e84030305f481de58f46886cf9255181a526afb54d":-14,"aeefceae2b54d5faef702e5e2cc9ac9f532d76b99f783c1c30398df82ff35ae5":167,"a99d4a0ef4401b07eb65e2cfa0c5ff2089276c4e779baebc094843ae1373ae84":-34,"a63acf83af95e0c1a84061c877482773f78b9b3317ff035a9d62dac65270a8ed":-1},"s":"OyDGm6BLVkl90OzXJJwUEKLwNIvWVPFIlj_W_uGSMOehOMaR7kpqGzNLNxnfR0E5SH4nx1yo07NYVQFEo-2oHcKo1fYY9eEfVAMHLnS2M3IPynExOy8QFttmakMDW7Ola0FXrRempu4sPALHPGJt1s0-37b1k3aFF0DhAyiFv4GgFg0mtQFZqCJWPtUDgG0n-5TTxOoGB8Rd-LVub0-DurhiA6QnIorkaqzMstAotNPPnQ4ERR2LXwLyw4uNgDd7JeEih_7YcEzxjH6w83OGhz1ZTet8_56lsNzV4DrRcG7A_qI27s7zG72CURGB63iXB6JKiTWnM1Pdzxe6kzMWswAAAYcWECWY"}',
              },
              link: "email_next_link",
              name: `${this.firstName} ${this.lastName}`,
              email: this.email,
              birthday: { day: 5, month: 6, year: 1990 },
              personalization_settings: {
                allow_cookie_use: true,
                allow_device_personalization: true,
                allow_partnerships: true,
                allow_ads_personalization: true,
              },
            },
          },
          {
            subtask_id: "SignupSettingsListEmailNonEU",
            settings_list: {
              setting_responses: [
                {
                  key: "twitter_for_web",
                  response_data: { boolean_data: { result: true } },
                },
              ],
              link: "next_link",
            },
          },
          {
            subtask_id: "SignupReview",
            sign_up_review: { link: "signup_with_email_next_link" },
          },
          {
            subtask_id: "ArkoseEmail",
            web_modal: {
              completion_deeplink: `twitter://onboarding/web_modal/next_link?access_token=${this.funcaptchaToken}`,
              link: "signup_with_email_next_link",
            },
          },
          {
            subtask_id: "EmailVerification",
            email_verification: {
              code: `${code}`,
              email: this.email,
              link: "next_link",
            },
          },
        ],
      },
      responseType: "json",
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      reqConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let res = await got(reqConfig);
    if (
      res.body.status === "success" &&
      res.body.subtasks[0].subtask_id == "EnterPassword"
    ) {
      try {
        await this.submitPassword(res.body.flow_token);
      } catch (e) {
        // console.log(e.response.body);
      }
    } else {
      // console.log(res.body);
    }
  }

  async submitPassword(flowToken) {
    this.log(`Submitting password...`, "info");
    let reqConfig = {
      cookieJar: this.cookieJar,
      method: "POST",
      url: "https://twitter.com/i/api/1.1/onboarding/task.json",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/111.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Referer: "https://twitter.com/",
        "x-guest-token": this.guestToken,
        "x-twitter-client-language": "en",
        "x-csrf-token": "1051f0c63ed27da63d75f854798dc1dc",
        "x-twitter-active-user": "yes",
        Origin: "https://twitter.com",
        authorization:
          "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
      },
      json: {
        flow_token: flowToken,
        subtask_inputs: [
          {
            subtask_id: "EnterPassword",
            enter_password: {
              password: this.password,
              link: "next_link",
            },
          },
        ],
      },
      responseType: "json",
    };
    if (this.task.useProxies === true) {
      await this.setProxy();
      reqConfig.agent = {
        https: this.proxyAgent,
      };
    }
    let res = await got(reqConfig);
    this.log(`Account created!`, "success");
    this.saveAccounts({
      email: this.email,
      site: "Twitter",
      password: this.password,
    });
    await this.sendWebhook({
      title: `Twitter Account Generated`,
      thumbnail:
        "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
      fields: [
        {
          name: "Site",
          value: "Twitter",
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

  getRandom(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  async loginImap() {
    this.log(`IMAP listening... (${this.counter}/${this.task.genCount})`);
    let client = inbox.createConnection(false, this.imapConfig.provider, {
      secureConnection: true,
      auth: {
        user: this.imapConfig.email,
        pass: this.imapConfig.password,
      },
    });
    let code = null;
    client.connect();
    client.on("connect", () => {
      client.openMailbox("INBOX", async (error, info) => {
        client.on("new", async (message) => {
          if (
            message.to[0].address.toLowerCase() === this.email.toLowerCase()
          ) {
            const messageStream = client.createMessageStream(message.UID);
            let parsed = await simpleParser(messageStream);
            code = parsed.subject
              .replace("is your Twitter verification code", "")
              .replace(/ /g, "");
            await this.submitDetails(code);
            client.close();
            client.on("close", () => {});
          }
        });
      });
    });
  }

  log(message, type) {
    if (this.imapConfig) {
      global.logThis(
        `[Twitter] -- [${this.task.catchall}] -- ${message} [ IMAP: ${this.imapConfig.email} ]`,
        type
      );
    } else {
      global.logThis(
        `[Twitter] -- [${this.task.catchall}] -- ${message}`,
        type
      );
    }
  }
};
