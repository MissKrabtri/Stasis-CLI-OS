const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-nft");
const { v4: uuidv4 } = require("uuid");
const {
  generateSolanawallet,
  generateEthwallet,
  addSolanaWallet,
  exportWallets,
  checkSolanaBalance,
  checkEthBalance,
} = require(`../utils.js`);

const handleWalletManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "walletManagerAction",
      message: "Wallet Manager:",
      choices: [
        "Add wallet",
        `Generate wallets`,
        "View my wallets",
        "Export Wallets",
        "Check Balance",
        "Clear all wallets",
        "Go Back",
      ],
    },
  ]);

  if (response.walletManagerAction === "Add wallet") {
    let addType = await inquirer.prompt([
      {
        type: "list",
        name: "addType",
        message: "What blockchain would you like to add a wallet for?",
        choices: [`Solana`, "Ethereum"],
      },
    ]);
    if (addType.addType === "Solana") {
      let solPk = await inquirer.prompt([
        {
          type: "input",
          name: "solPk",
          message: "Paste the wallet private key:",
        },
      ]);
      let walletDetails = await addSolanaWallet(solPk.solPk);
      let wallet = {
        id: uuidv4(),
        publicKey: walletDetails.publicKey,
        secretKey: walletDetails.secretKey,
        type: "SOL",
        encrypted: true,
      };
      let saved = config.get("stasis-nft.wallets");
      saved.push(wallet);
      config.set("stasis-nft.wallets", saved);
      global.logThis(`Solana wallet added!`, "success");
      await global.sleep(1500);
      global.runMain();
    } else if (addType.addType === "Ethereum") {
      //
    }
  } else if (response.walletManagerAction === "Generate wallets") {
    let genType = await inquirer.prompt([
      {
        type: "list",
        name: "genType",
        message: "What blockchain would you like to generate wallets for?",
        choices: [`Solana`, "Ethereum"],
      },
    ]);

    if (genType.genType === "Solana") {
      let genCount = await inquirer.prompt([
        {
          type: "input",
          name: "genCount",
          message: "How many would you like to generate?",
        },
        {
          type: "confirm",
          name: "encryptPk",
          message: "Would you like to encrypt the secretKey?",
        },
      ]);

      if (genCount.genCount > 0) {
        let saved = config.get("stasis-nft.wallets");
        for (let i = 0; i < genCount.genCount; i++) {
          let generatedWallet = await generateSolanawallet(genCount.encryptPk);
          let wallet = {
            id: uuidv4(),
            publicKey: generatedWallet.publicKey,
            secretKey: generatedWallet.secretKey,
            type: "SOL",
            encrypted: genCount.encryptPk,
          };
          saved.push(wallet);
        }
        config.set("stasis-nft.wallets", saved);
        global.logThis(
          `${genCount.genCount} Solana wallets generated!`,
          "success"
        );
        await global.sleep(1500);
        global.runMain();
      }
    } else if (genType.genType === "Ethereum") {
      let genCount = await inquirer.prompt([
        {
          type: "input",
          name: "genCount",
          message: "How many would you like to generate?",
        },
        {
          type: "confirm",
          name: "encryptPk",
          message: "Would you like to encrypt the secretKey?",
        },
      ]);
      if (genCount.genCount > 0) {
        let saved = config.get("stasis-nft.wallets");
        for (let i = 0; i < genCount.genCount; i++) {
          let generatedWallet = await generateEthwallet(genCount.encryptPk);
          let wallet = {
            id: uuidv4(),
            publicKey: generatedWallet.publicKey,
            secretKey: generatedWallet.secretKey,
            type: "ETH",
            encrypted: genCount.encryptPk,
          };
          saved.push(wallet);
        }
        config.set("stasis-nft.wallets", saved);
        global.logThis(
          `${genCount.genCount} Ethereum wallets generated!`,
          "success"
        );
        await global.sleep(1500);
        global.runMain();
      }
    }
  } else if (response.walletManagerAction === "View my wallets") {
    let saved = config.get("stasis-nft.wallets");
    if (saved.length > 0) {
      global.logThis(`You have ${saved.length} wallets saved!`, "warn");
      console.table(saved, ["type", "publicKey", "encrypted"]);
      await global.sleep(1500);
      global.runMain();
    } else {
      global.logThis("No wallets saved!", "error");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.walletManagerAction === "Clear all wallets") {
    let saved = config.get("stasis-nft.wallets");
    saved = [];
    config.set("stasis-nft.wallets", saved);
    global.logThis("All wallets cleared!", "success");
    await global.sleep(1500);
    global.runMain();
  } else if (response.walletManagerAction === "Export Wallets") {
    let saved = config.get("stasis-nft.wallets");
    let readyToNotify = await exportWallets(saved);
    if (readyToNotify) {
      global.logThis("Wallets exported to Stasis NFT directory!", "success");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.walletManagerAction === "Check Balance") {
    let saved = config.get("stasis-nft.wallets");
    if (saved.length > 0) {
      for (let wallet of saved) {
        if (wallet.type === "SOL") {
          let bal = await checkSolanaBalance(wallet.publicKey);
          global.logThis(
            `--- Type: ${wallet.type} | Balance: ${bal} SOL | Wallet: ${wallet.publicKey}`,
            "info"
          );
        } else if (wallet.type === "ETH") {
          let bal = await checkEthBalance(wallet.publicKey);
          global.logThis(
            `--- Type: ${wallet.type} | Balance: ${bal} ETH | Wallet: ${wallet.publicKey}`,
            "info"
          );
        }
      }
      global.logThis("Balance fetch complete.", "success");
      await global.sleep(7000);
      global.runMain();
    } else {
      global.logThis("No wallets saved!", "error");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.walletManagerAction === "Go Back") {
    global.runMain();
  }
};

module.exports = {
  handleWalletManager,
};
