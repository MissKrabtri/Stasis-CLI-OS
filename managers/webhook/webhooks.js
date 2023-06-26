const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { testWebhook } = require(`../utils.js`);

const handleWebhookManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "webhookManagerAction",
      message: "Webhook Manager:",
      choices: [
        "Add Discord Webhook",
        "View All Webhooks",
        "Test All Webhooks",
        "Clear All Webhooks",
        "Go Back",
      ],
    },
  ]);
  if (response.webhookManagerAction === "Add Discord Webhook") {
    let webhookToSaveResp = await inquirer.prompt([
      {
        type: "input",
        name: "addWebhook",
        message: "Paste Discord Webhook:",
      },
    ]);

    if (
      webhookToSaveResp.addWebhook.startsWith(
        "https://discord.com/api/webhooks"
      )
    ) {
      let saved = await config.get("stasis-cli.webhooks");
      saved.push(webhookToSaveResp.addWebhook);
      await config.set("stasis-cli.webhooks", saved);
      global.logThis("Webhook Added", "success");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.webhookManagerAction === "View All Webhooks") {
    let saved = await config.get("stasis-cli.webhooks");
    global.logThis("Saved Webhooks:", "info");
    for (let hook of saved) {
      global.logThis(`Webhook URL: ${hook}`, "info");
    }
    await global.sleep(1500);
    global.runMain();
  } else if (response.webhookManagerAction === "Test All Webhooks") {
    let saved = await config.get("stasis-cli.webhooks");
    global.logThis("Testing Webhooks...", "info");
    if (saved.length > 0) {
      saved.forEach((webhook) => {
        testWebhook(webhook);
      });
      await global.sleep(1500);
      global.runMain();
    } else if (saved.length === 0) {
      global.logThis("No Webhooks to Test", "error");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.webhookManagerAction === "Clear All Webhooks") {
    let saved = await config.get("stasis-cli.webhooks");
    saved = [];
    await config.set("stasis-cli.webhooks", saved);
    global.logThis("Webhooks Cleared", "success");
    await global.sleep(1500);
    global.runMain();
  } else if (response.webhookManagerAction === "Go Back") {
    global.runMain();
  }
};

module.exports = {
  handleWebhookManager,
};
