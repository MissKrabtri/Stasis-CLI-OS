const bytenode = require("bytenode");
const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { v4: uuidv4 } = require("uuid");
const { testSolanaRPC } = require(`../utils.js`);

const handleRpcManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "rpcManagerAction",
      message: "RPC Manager:",
      choices: [
        `Add RPC`,
        `Test all RPCs`,
        `View all RPCs`,
        `Clear all RPCs`,
        "Go Back",
      ],
    },
  ]);

  if (response.rpcManagerAction === "Add RPC") {
    let rpcToSave = await inquirer.prompt([
      {
        type: "input",
        name: "addRpc",
        message: "Paste Solana RPC:",
      },
    ]);

    if (rpcToSave.addRpc) {
      let saved = await config.get("stasis-cli.rpc");
      saved.push({
        url: rpcToSave.addRpc,
        type: "SOL",
        id: uuidv4(),
      });
      await config.set("stasis-cli.rpc", saved);
      global.logThis("RPC Added", "success");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.rpcManagerAction === "Test all RPCs") {
    global.logThis("Testing RPCs...", "warn");
    let saved = await config.get("stasis-cli.rpc");
    if (saved.length > 0) {
      saved.forEach(async (rpc) => {
        let endTime = await testSolanaRPC(rpc.url);
        global.logThis(
          `--- Endpoint: ${rpc.url} | Speed: ${endTime}ms | Type: ${rpc.type}`,
          "info"
        );
      });
    } else {
      global.logThis("No RPCs saved", "error");
    }
    await global.sleep(10000);
    global.runMain();
  } else if (response.rpcManagerAction === "View all RPCs") {
    global.logThis("Saved RPCs:", "warn");
    let saved = await config.get("stasis-cli.rpc");
    saved = saved.map((rpc) => {
      return {
        type: rpc.type,
        url: rpc.url.slice(0, 45) + "...",
      };
    });
    console.table(saved, ["type", "url"]);
    await global.sleep(1500);
    global.runMain();
  } else if (response.rpcManagerAction === "Clear all RPCs") {
    let saved = await config.get("stasis-cli.rpc");
    saved = [];
    await config.set("stasis-cli.rpc", saved);
    global.logThis("RPCs Cleared", "success");
    await global.sleep(1500);
    global.runMain();
  } else if (response.rpcManagerAction === "Go Back") {
    global.runMain();
  }
};

module.exports = {
  handleRpcManager,
};
