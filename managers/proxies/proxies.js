const bytenode = require("bytenode");
const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { v4: uuidv4 } = require("uuid");
const { getProxyFile, parseProxyString } = require(`../utils.js`);
const got = require("got");
const { HttpsProxyAgent } = require("https-proxy-agent");
const { HttpProxyAgent } = require("http-proxy-agent");
const axios = require("axios");

const handleProxyManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "action",
      message: "Proxy Manager:",
      choices: ["Test all proxies", "Go Back"],
    },
  ]);

  if (response.action === "Test all proxies") {
    let savedProxies = await getProxyFile();
    if (savedProxies === null) {
      global.logThis("No proxies loaded!", "error");
      await sleep(1500);
      global.runMain();
    } else {
      savedProxies = savedProxies.split("\n");
      global.logThis(
        `[PROXY TESTER] - Testing ${savedProxies.length} proxies...`,
        "warn"
      );
      let promises = [];
      for (let proxy of savedProxies) {
        let formatted = parseProxyString(proxy);
        if (formatted) {
          promises.push(testProxy(formatted));
        }
      }
      await Promise.allSettled(promises);
      global.logThis(
        `Finished testing ${savedProxies.length} proxies!`,
        "success"
      );
      await sleep(1500);
      global.runMain();
    }
  } else if (response.action === "Go Back") {
    global.runMain();
  }
};

const testProxy = async (proxy) => {
  try {
    global.logThis(
      `[PROXY TESTER] - Testing ${proxy.replace("http://", "")}`,
      "info"
    );
    let start = new Date();
    let t = await axios("https://api.ipify.org/", {
      timeout: 5000,
      httpsAgent: new HttpsProxyAgent(proxy),
    });
    let end = new Date() - start;
    global.logThis(
      `[PROXY TESTER] - [LATENCY]: ${end}ms - ${proxy.replace("http://", "")}`,
      "info"
    );
  } catch (e) {
    global.logThis(
      `[PROXY TESTER] - Connection Failed - ${proxy.replace("http://", "")}`,
      "error"
    );
  }
};

module.exports = {
  handleProxyManager,
};
