const inquirer = require("inquirer");
const chalk = require("chalk");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const discordRpc = require(`./services/discordRpc.js`);
const { launchTLS } = require(`./managers/tls/tls.js`);
const { version } = require("./package.json");
const { defaultConfig, logLogo } = require(`./managers/utils.js`);
const { handleTasksManager } = require(`./managers/task/tasks.js`);
const { handleRpcManager } = require(`./managers/rpc/rpc.js`);
const { handleWalletManager } = require(`./managers/wallet/wallets.js`);
const { handleSettingsManager } = require(`./managers/settings/settings.js`);
const { handleToolBox } = require(`./managers/toolbox/tools.js`);
const { handleProxyManager } = require(`./managers/proxies/proxies.js`);

const log = (message, type) => {
  switch (type) {
    case "error":
      console.log(chalk.red(message));
      break;
    case "success":
      console.log(chalk.green(message));
      break;
    case "warn":
      console.log(chalk.yellow(message));
      break;
    case "info":
      console.log(chalk.blueBright(message));
      break;
  }
};

const run = async () => {
  await launchTLS();
  process.title = `Stasis AIO - Version: ${global.version} - Total Tasks: ${global.savedConfig.tasks.length} - Bypass: ${global.tlsPort}`;
  logLogo();
  console.log("");
  let answer = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "What would you like to do:",
      choices: [
        `Tasks`,
        "Proxies",
        "Wallets",
        "RPC",
        "Toolbox",
        "Settings",
        "Force Refresh Configuration",
        "Exit CLI",
      ],
    },
  ]);
  if (answer.action === "Exit CLI") {
    log("👋 Exiting Stasis AIO...", "error");
    process.exit();
  } else {
    if (answer.action === "Tasks") {
      await handleTasksManager();
    } else if (answer.action === "Wallets") {
      await handleWalletManager();
    } else if (answer.action === "Force Refresh Configuration") {
      log("🕒 Refreshing Configuration...", "info");
      global.savedConfig = config.get("stasis-cli");
      log("🟢 Configuration refreshed!", "success");
      await sleep(1500);
      run();
    } else if (answer.action === "RPC") {
      await handleRpcManager();
    } else if (answer.action === "Settings") {
      await handleSettingsManager();
    } else if (answer.action === "Toolbox") {
      await handleToolBox();
    } else if (answer.action === "Proxies") {
      await handleProxyManager();
    }
  }
};

const main = async () => {
  global.version = version;
  global.savedConfig = config.get("stasis-cli");
  global.apiURL = "";
  global.tasks = [];
  global.logThis = log;
  global.runMain = run;
  global.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  if (!global.savedConfig) {
    config.set("stasis-cli", defaultConfig);
    global.savedConfig = config.get("stasis-cli");
  }
  log(`🔵 Verifying system...`, "info");
  new discordRpc().launchRPC();
  log("🟢 System verified, welcome back!", "success");
  run();
};

main();
