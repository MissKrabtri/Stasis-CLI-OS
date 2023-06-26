const inquirer = require("inquirer");
const Conf = require("conf");
const { sendViews } = require(`./tools/ebayViews.js`);
const { sendMercariViews } = require(`./tools/mercariViews.js`);
const { sendOfferUpViews } = require(`./tools/offerUpViews.js`);
const SpoofBrowser = require(`./tools/spoofBrowser.js`);
const { v4: uuid } = require("uuid");

const handleToolBox = async () => {
  const config = new Conf("stasis-cli");
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Toolbox:",
      choices: [
        "eBay View Bot",
        "Mercari View Bot",
        "OfferUp View Bot",
        "Spoof Browser",
      ],
    },
  ]);

  if (response.action === "eBay View Bot") {
    let response = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "eBay Listing URL:",
      },
      {
        type: "input",
        name: "sendQty",
        message: "How many views would you like to send?",
      },
      {
        type: "confirm",
        name: "useProxies",
        message: "Use proxies?",
      },
      {
        type: "confirm",
        name: "autoBoost",
        message: "Would you like to auto boost this listing?",
      },
    ]);

    sendViews(
      response.url,
      response.useProxies,
      response.sendQty,
      response.autoBoost
    );
  } else if (response.action === "Mercari View Bot") {
    let response = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "Mercari Listing URL:",
      },
      {
        type: "input",
        name: "sendQty",
        message: "How many views would you like to send?",
      },
      {
        type: "confirm",
        name: "useProxies",
        message: "Use proxies?",
      },
      {
        type: "confirm",
        name: "autoBoost",
        message: "Would you like to auto boost this listing?",
      },
    ]);

    sendMercariViews(
      response.url,
      response.useProxies,
      response.sendQty,
      response.autoBoost
    );
  } else if (response.action === "Spoof Browser") {
    let res = await inquirer.prompt([
      {
        type: "list",
        name: "browser",
        message: "Select a browser:",
        choices: ["Chrome", "Firefox"],
      },
      {
        type: "input",
        name: "url",
        message: "Desired URL:",
      },
      {
        type: "confirm",
        name: "slowOpen",
        message: "Slow open?",
      },
      {
        type: "input",
        name: "browserCount",
        message: "Browser Quantity:",
      },
      {
        type: "confirm",
        name: "useProxies",
        message: "Use Proxies?",
      },
    ]);
    let obj = {
      browser: res.browser,
      url: res.url,
      slowOpen: res.slowOpen,
      useProxies: res.useProxies,
    };
    for (let i = 1; i <= res.browserCount; i++) {
      let t = new SpoofBrowser(obj.browser, obj.url, obj.useProxies, uuid());
      if (obj.slowOpen === true) {
        await t.launch();
      } else {
        t.launch();
      }
    }
  } else if (response.action === "OfferUp View Bot") {
    let response = await inquirer.prompt([
      {
        type: "input",
        name: "url",
        message: "OfferUp Listing URL:",
      },
      {
        type: "input",
        name: "sendQty",
        message: "How many views would you like to send?",
      },
      {
        type: "confirm",
        name: "useProxies",
        message: "Use proxies?",
      },
      {
        type: "confirm",
        name: "autoBoost",
        message: "Would you like to auto boost this listing?",
      },
    ]);

    sendOfferUpViews(
      response.url,
      response.sendQty,
      response.useProxies,
      response.autoBoost
    );
  }
};

module.exports = {
  handleToolBox,
};
