const bytenode = require("bytenode");
const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { handleWebhookManager } = require(`../webhook/webhooks.js`);
const { v4: uuid } = require("uuid");
const e = require("express");

const handleSettingsManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "AIO Settings:",
      choices: ["Captcha", "IMAP", "SMS", "Webhooks", "Go Back"],
    },
  ]);
  if (response.action === "Go Back") {
    global.runMain();
  } else if (response.action === "Webhooks") {
    global.logThis("🕒 Opening Webhook Manager...", "info");
    await handleWebhookManager();
  } else if (response.action === "SMS") {
    let smsRes = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "SMS Settings:",
        choices: [
          "Add SMS Provider",
          "View SMS Providers",
          "Clear All Providers",
          "Go Back",
        ],
      },
    ]);
    if (smsRes.action === "Add SMS Provider") {
      let addNewSmsRes = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Select SMS provider to add:",
          choices: ["5sim.net"],
        },
        {
          type: "input",
          name: "apiKey",
          message: "Paste API Key:",
        },
      ]);

      let saved = await config.get("stasis-cli");
      if (!saved.sms) {
        saved.sms = {
          fivesim: "",
        };
      } else {
        if (addNewSmsRes.action === "5sim.net") {
          saved.sms.fivesim = addNewSmsRes.apiKey;
        }
        await config.set("stasis-cli", saved);
      }

      await config.set("stasis-cli", saved);
      global.logThis("🟢 SMS Provider updated!", "success");
      await global.sleep(2500);
      global.runMain();
    } else if (smsRes.action === "View SMS Providers") {
      let saved = await config.get("stasis-cli");
      if (!saved.sms) {
        global.logThis("🔴 No SMS Providers saved!", "error");
      } else {
        global.logThis("🟢 SMS Providers:", "success");
        global.logThis("5sim.net: " + saved.sms.fivesim, "info");
        await global.sleep(5000);
        global.runMain();
      }
    } else if (smsRes.action === "Clear All Providers") {
      let saved = await config.get("stasis-cli");
      global.logThis("🟢 SMS Providers cleared!", "success");
      if (saved.sms) {
        saved.sms = {
          fivesim: "",
          smsactivate: "",
        };
        await config.set("stasis-cli", saved);
      }

      await global.sleep(2500);
      global.runMain();
    } else if (smsRes.action === "Go Back") {
      global.runMain();
    }
  } else if (response.action === "Captcha") {
    let captchaRes = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Captcha Manager:",
        choices: [
          "Add Captcha Provider",
          "View saved Captcha Providers",
          "Clear All Providers",
          "Go Back",
        ],
      },
    ]);
    if (captchaRes.action === "Add Captcha Provider") {
      let captchaRes2 = await inquirer.prompt([
        {
          type: "list",
          name: "provider",
          message: "Captcha Provider:",
          choices: ["2captcha", "CapMonster", "CapSolver"],
        },
        {
          type: "input",
          name: "apiKey",
          message: "Paste API Key:",
        },
      ]);
      let saved = await config.get("stasis-cli");
      if (!saved.captcha) {
        saved.captcha = {
          twocaptcha: "",
          capmonster: "",
          capsolver: "",
        };
      }

      if (captchaRes2.provider === "2captcha") {
        saved.captcha.twocaptcha = captchaRes2.apiKey;
      } else if (captchaRes2.provider === "CapMonster") {
        saved.captcha.capmonster = captchaRes2.apiKey;
      } else if (captchaRes2.provider === "CapSolver") {
        saved.captcha.capsolver = captchaRes2.apiKey;
      }

      await config.set("stasis-cli", saved);
      global.logThis("🟢 Captcha Provider updated!", "success");
      await global.sleep(2500);
      global.runMain();
    } else if (captchaRes.action === "View saved Captcha Providers") {
      let saved = await config.get("stasis-cli");
      if (!saved.captcha) {
        global.logThis("🔴 No Captcha Providers saved!", "error");
      } else {
        global.logThis("🟢 Captcha Providers:", "success");
        global.logThis("2captcha: " + saved.captcha.twocaptcha, "info");
        global.logThis("CapMonster: " + saved.captcha.capmonster, "info");
        global.logThis("CapSolver: " + saved.captcha.capsolver, "info");
      }

      await global.sleep(5000);
      global.runMain();
    } else if (captchaRes.action === "Clear All Providers") {
      let saved = await config.get("stasis-cli");
      if (saved.captcha) {
        saved.captcha = {
          twocaptcha: "",
          capmonster: "",
          capsolver: "",
        };
        await config.set("stasis-cli", saved);
        global.logThis("🟢 Captcha Providers cleared!", "success");
      } else {
        global.logThis("🔴 No Captcha Providers saved!", "error");
      }

      await global.sleep(2500);
      global.runMain();
    } else if (captchaRes.action === "Go Back") {
      global.runMain();
    }
  } else if (response.action === "IMAP") {
    let imapRes = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "IMAP Manager:",
        choices: [
          "Add IMAP Provider",
          "View saved IMAP Providers",
          "Clear All Providers",
          "Go Back",
        ],
      },
    ]);

    if (imapRes.action === "Add IMAP Provider") {
      let options = [
        {
          label: "GMAIL",
          value: "imap.gmail.com",
        },
        {
          label: "Yahoo",
          value: "imap.mail.yahoo.com",
        },
        {
          label: "Outlook",
          value: "imap-mail.outlook.com",
        },
        {
          label: "AOL",
          value: "imap.aol.com",
        },
        {
          label: "iCloud",
          value: "imap.mail.me.com",
        },
        {
          label: "Zoho",
          value: "imap.zoho.com",
        },
        {
          label: "FastMail",
          value: "imap.fastmail.com",
        },
        {
          label: "GMX",
          value: "imap.gmx.com",
        },
        {
          label: "Yandex",
          value: "imap.yandex.com",
        },
      ];
      let addImapRes = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "IMAP Provider:",
          choices: options.map((x) => x.label),
        },
        {
          type: "input",
          name: "email",
          message: "IMAP Email:",
        },
        {
          type: "password",
          name: "password",
          message:
            "IMAP Password (If 2FA is enabled, check if you need an app password - then use that!):",
        },
      ]);

      let obj = {
        email: addImapRes.email,
        password: addImapRes.password,
        provider: options.find((x) => x.label === addImapRes.action).value,
        id: uuid(),
      };
      let saved = await config.get("stasis-cli");
      if (!saved.imap) {
        saved.imap = [];
      }
      saved.imap.push(obj);
      await config.set("stasis-cli", saved);
      global.logThis("🟢 IMAP Provider added!", "success");
      await global.sleep(2500);
      global.runMain();
    } else if (imapRes.action === "View saved IMAP Providers") {
      let saved = await config.get("stasis-cli");
      if (!saved.imap || saved.imap.length === 0) {
        global.logThis("🔴 No IMAP Providers saved!", "error");
      } else {
        global.logThis(`🟢 IMAP Providers (${saved.imap.length}):`, "success");
        console.table(saved.imap, ["provider", "email", "password"]);
      }
      await global.sleep(5000);
      global.runMain();
    } else if (imapRes.action === "Clear All Providers") {
      let saved = await config.get("stasis-cli");
      if (saved.imap) {
        saved.imap = [];
        await config.set("stasis-cli", saved);
        global.logThis("🟢 IMAP Providers cleared!", "success");
      } else {
        global.logThis("🔴 No IMAP Providers saved!", "error");
      }
      await global.sleep(2500);
      global.runMain();
    } else if (imapRes.action === "Go Back") {
      global.runMain();
    }
  }
};

module.exports = {
  handleSettingsManager,
};
