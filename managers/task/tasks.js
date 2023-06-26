const inquirer = require("inquirer");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { v4: uuidv4 } = require("uuid");
const { getMagicEdenAttributes } = require(`../utils.js`);
const MagicEdenSniper = require(`./tasks/sol/Magic Eden/sniper.js`);
const FFFsniper = require(`./tasks/sol/FFF/sniper.js`);
const raydiumSniper = require(`./tasks/sol/Raydium/sniper.js`);
const kkModule = require(`./tasks/deals/krispy kreme/KK.js`);
const cpkModule = require(`./tasks/deals/california pizza kitchen/CPK.js`);
const outlookModule = require(`./tasks/generators/outlook/Outlook.js`);
const walmartModule = require(`./tasks/generators/walmart/Walmart.js`);
const shopifyModule = require(`./tasks/generators/shopify/Shopify.js`);
const targetAccGen = require(`./tasks/generators/target/Target.js`);
const ebayGen = require(`./tasks/generators/ebay/eBay.js`);
const twitterGen = require(`./tasks/generators/twitter/Twitter.js`);
let gmailGen = require(`./tasks/generators/gmail/GMAIL.js`);

const handleTasksManager = async () => {
  let response = await inquirer.prompt([
    {
      type: "list",
      name: "taskManagerAction",
      message: "Task Manager:",
      choices: [
        `Run all tasks`,
        "Create tasks",
        "View all tasks",
        "Clear all tasks",
        "Go Back",
      ],
    },
  ]);

  if (response.taskManagerAction === "Run all tasks") {
    let saved = config.get("stasis-cli.tasks");
    if (saved.length > 0) {
      saved.forEach((task) => {
        if (task && task.blockchain) {
          if (task.blockchain === "SOL") {
            if (task.module === "Magic Eden Sniper") {
              let me = new MagicEdenSniper(task);
              me.run();
            } else if (task.module === "FFF Sniper") {
              let fff = new FFFsniper(task);
              fff.run();
            } else if (task.module === "Raydium Sniper") {
              let fff = new raydiumSniper(task);
              fff.run();
            }
          }
        } else {
          if (task.module === "Krispy Kreme") {
            let t = new kkModule(task);
            t.run();
          } else if (task.module === "California Pizza Kitchen") {
            let t = new cpkModule(task);
            t.run();
          } else if (task.module === "Outlook") {
            let t = new outlookModule(task);
            t.run();
          } else if (task.module === "Walmart") {
            let w = new walmartModule(task);
            w.run();
          } else if (task.module === "Shopify") {
            let s = new shopifyModule(task);
            s.run();
          } else if (task.module === "Target Gen") {
            let t = new targetAccGen(task);
            t.run();
          } else if (task.module === "eBay Gen") {
            let e = new ebayGen(task);
            e.run();
          } else if (task.module === "Twitter") {
            let t = new twitterGen(task);
            t.run();
          } else if (task.module === "GMAIL") {
            let t = new gmailGen(task);
            t.run();
          }
        }
      });
    } else {
      global.logThis("No tasks found.", "error");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.taskManagerAction === "Create tasks") {
    let moduleCat = await inquirer.prompt([
      {
        type: "list",
        name: "action",
        message: "Select Module category:",
        choices: ["NFT", "Account Generators", "Food Deals"],
      },
    ]);
    if (moduleCat.action === "NFT") {
      let taskCreatorResp1 = await inquirer.prompt([
        {
          type: "list",
          name: "taskCreatorResp1",
          message: "Select Blockchain:",
          choices: ["Solana"],
        },
      ]);
      if (taskCreatorResp1.taskCreatorResp1 === "Solana") {
        let taskCreatorResp2 = await inquirer.prompt([
          {
            type: "list",
            name: "taskCreatorResp2",
            message: "Select Module:",
            choices: [
              "Magic Eden Sniper",
              "Famous Foxes Token Sniper",
              "Raydium Token Sniper",
            ],
          },
        ]);
        if (taskCreatorResp2.taskCreatorResp2 === "Magic Eden Sniper") {
          let savedWallets = config.get("stasis-cli.wallets");
          if (savedWallets.length === 0) {
            global.logThis("No Wallets saved.", "error");
            await global.sleep(1500);
            global.runMain();
          } else {
            let savedRpc = config.get("stasis-cli.rpc");
            let magicEden = await inquirer.prompt([
              {
                type: "input",
                name: "collection",
                message: "Collection Slug:",
              },
              {
                type: "list",
                name: "mode",
                message: "Select Mode:",
                choices: ["Default", "Experimental"],
              },
              {
                type: "list",
                name: "wallet",
                message: "Select Wallet:",
                choices: savedWallets
                  .filter((x) => x.type === "SOL")
                  .map((wallet) => wallet.publicKey),
              },
              {
                type: "list",
                name: "rpc",
                message: "Select RPC Endpoint:",
                choices: savedRpc
                  .filter((x) => x.type === "SOL")
                  .map((ep) => ep.url),
              },
              {
                type: "input",
                name: "maxPrice",
                message: "Max Price (SOL):",
              },
              {
                type: "confirm",
                name: "useProxies",
                message: "Use Proxies?",
              },
            ]);
            let meFilterByRank = await inquirer.prompt([
              {
                type: "confirm",
                name: "filterByRank",
                message: "Filter by Rank?",
              },
            ]);
            let filterRank = meFilterByRank.filterByRank;
            let rankConfig = {};
            if (filterRank === true) {
              let meRankProvider = await inquirer.prompt([
                {
                  type: "list",
                  name: "meRankProvider",
                  message: "Rank Provider:",
                  choices: ["MErarity", "MoonRank", "HowRare"],
                },
                {
                  type: "input",
                  name: "meMaxRank",
                  message: "Max Rank:",
                },
              ]);

              rankConfig = {
                provider: meRankProvider.meRankProvider,
                maxRank: meRankProvider.meMaxRank,
              };
            }
            let meFilterByAttributes = await inquirer.prompt([
              {
                type: "confirm",
                name: "value",
                message: "Filter by Attributes?",
              },
            ]);
            // Get attributes from API
            let fetchedAttr = await getMagicEdenAttributes(
              magicEden.collection
            );
            let collectionAttributesList = [];
            for (let attr of fetchedAttr.results.availableAttributes) {
              let found = collectionAttributesList.find(
                (x) => x.trait === attr.attribute.trait_type
              );
              if (!found) {
                collectionAttributesList.push({
                  trait: attr.attribute.trait_type,
                  values: [attr.attribute.value],
                });
              } else {
                found.values.push(attr.attribute.value);
              }
            }
            //
            let meFilterAttri = meFilterByAttributes.value;

            let userSelectedTraits = [];
            if (meFilterAttri === true) {
              let isDone = false;
              do {
                let attributeTrait = await inquirer.prompt([
                  {
                    type: "list",
                    name: "value",
                    message: "Select Trait Type:",
                    choices: collectionAttributesList.map((x) => x.trait),
                  },
                ]);
                let attributeFilter = await inquirer.prompt([
                  {
                    type: "list",
                    name: "value",
                    message: "Select Attribute:",
                    choices: collectionAttributesList.find(
                      (x) => x.trait === attributeTrait.value
                    ).values,
                  },
                ]);
                userSelectedTraits.push({
                  trait: attributeTrait.value,
                  value: attributeFilter.value,
                });
                let allSetYet = await inquirer.prompt([
                  {
                    type: "confirm",
                    name: "isAllSet",
                    message: "All set?",
                  },
                ]);

                if (allSetYet.isAllSet === true) {
                  isDone = true;
                } else {
                  isDone = false;
                }
              } while (isDone === false);
            }

            let royaltyPercent = await inquirer.prompt([
              {
                type: "input",
                name: "value",
                message: "Royalty Percentage:",
              },
            ]);

            let taskQtyResp = await inquirer.prompt([
              {
                type: "input",
                name: "value",
                message: "How many tasks would you like to create?",
              },
            ]);

            global.logThis("Creating tasks...", "warn");
            let saved = config.get("stasis-cli.tasks");
            for (let i = 0; i < taskQtyResp.value; i++) {
              let newTask = {
                id: uuidv4(),
                collection: magicEden.collection,
                mode: magicEden.mode,
                wallet: magicEden.wallet,
                rpc: magicEden.rpc,
                maxPrice: magicEden.maxPrice,
                rankConfig: rankConfig,
                attributes: userSelectedTraits,
                module: "Magic Eden Sniper",
                blockchain: "SOL",
                royalty: royaltyPercent.value,
                useProxies: magicEden.useProxies,
              };
              saved.push(newTask);
            }
            await config.set("stasis-cli.tasks", saved);
          }
        } else if (
          taskCreatorResp2.taskCreatorResp2 === "Famous Foxes Token Sniper"
        ) {
          let savedWallets = config.get("stasis-cli.wallets");
          let savedRpc = config.get("stasis-cli.rpc");
          if (savedWallets.length === 0) {
            global.logThis("No Wallets saved.", "error");
            await global.sleep(1500);
            global.runMain();
          } else if (savedRpc.length === 0) {
            global.logThis("No RPC saved.", "error");
            await global.sleep(1500);
            global.runMain();
          } else {
            let answers = await inquirer.prompt([
              {
                type: "input",
                name: "tokenAddress",
                message: "Paste token address:",
              },
              {
                type: "input",
                name: "taskQty",
                message: "How many tasks would you like to create?",
              },
              {
                type: "list",
                name: "wallet",
                message: "Select Wallet:",
                choices: savedWallets
                  .filter((x) => x.type === "SOL")
                  .map((wallet) => wallet.publicKey),
              },
              {
                type: "list",
                name: "rpc",
                message: "Select RPC Endpoint:",
                choices: savedRpc
                  .filter((x) => x.type === "SOL")
                  .map((ep) => ep.url),
              },
              {
                type: "input",
                name: "maxPrice",
                message: "Max Price (SOL):",
              },
            ]);
            global.logThis("Creating tasks...", "warn");
            let saved = config.get("stasis-cli.tasks");
            for (let i = 0; i < answers.taskQty; i++) {
              let newTask = {
                id: uuidv4(),
                token: answers.tokenAddress,
                wallet: answers.wallet,
                rpc: answers.rpc,
                maxPrice: answers.maxPrice,
                module: "FFF Sniper",
                blockchain: "SOL",
              };
              saved.push(newTask);
            }
            await config.set("stasis-cli.tasks", saved);
          }
        } else if (
          taskCreatorResp2.taskCreatorResp2 === "Raydium Token Sniper"
        ) {
          let savedWallets = config.get("stasis-cli.wallets");
          let savedRpc = config.get("stasis-cli.rpc");
          if (savedWallets.length === 0) {
            global.logThis("No Wallets saved.", "error");
            await global.sleep(1500);
            global.runMain();
          } else if (savedRpc.length === 0) {
            global.logThis("No RPC saved.", "error");
            await global.sleep(1500);
            global.runMain();
          } else {
            let swapTypePrompt = await inquirer.prompt([
              {
                type: "list",
                name: "swapFrom",
                message: "Token to buy with:",
                choices: ["USDC", "SOL"],
              },
            ]);
            let answers = await inquirer.prompt([
              {
                type: "input",
                name: "tokenAddress",
                message: "Token address to buy:",
              },
              {
                type: "input",
                name: "swapAmount",
                message: `Amount to buy (${swapTypePrompt.swapFrom}):`,
              },
              {
                type: "input",
                name: "slippage",
                message: "Desired slippage % (Number only!):",
              },
              {
                type: "input",
                name: "taskQty",
                message: "How many tasks would you like to create?",
              },
              {
                type: "list",
                name: "wallet",
                message: "Select Wallet:",
                choices: savedWallets
                  .filter((x) => x.type === "SOL")
                  .map((wallet) => wallet.publicKey),
              },
              {
                type: "list",
                name: "rpc",
                message: "Select RPC Endpoint:",
                choices: savedRpc
                  .filter((x) => x.type === "SOL")
                  .map((ep) => ep.url),
              },
            ]);
            global.logThis("Creating tasks...", "warn");
            let saved = config.get("stasis-cli.tasks");
            for (let i = 0; i < answers.taskQty; i++) {
              let newTask = {
                id: uuidv4(),
                swapFrom: swapTypePrompt.swapFrom,
                token: answers.tokenAddress,
                wallet: answers.wallet,
                rpc: answers.rpc,
                swapAmount: parseFloat(answers.swapAmount),
                slippage: parseFloat(answers.slippage),
                module: "Raydium Sniper",
                blockchain: "SOL",
              };
              saved.push(newTask);
            }
            await config.set("stasis-cli.tasks", saved);
            global.logThis(`${answers.taskQty} task(s) created!`, "success");
          }
        }
      }
    } else if (moduleCat.action === "Account Generators") {
      let accGenTask = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Select Generator:",
          choices: [
            "Shopify",
            "Walmart",
            "Target",
            "GMAIL",
            "eBay",
            "Twitter",
            "Outlook",
          ],
        },
      ]);
      if (accGenTask.action === "Shopify") {
        let shopifyGen = await inquirer.prompt([
          {
            type: "input",
            name: "site",
            message: "Target Site:",
          },
          {
            type: "input",
            name: "catchall",
            message: "Catchall:",
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < shopifyGen.taskQty; i++) {
          saved.push({
            id: uuidv4(),
            module: "Shopify",
            site: shopifyGen.site,
            catchall: shopifyGen.catchall,
            useProxies: shopifyGen.useProxies,
          });
        }
        await config.set("stasis-cli.tasks", saved);
      } else if (accGenTask.action === "Walmart") {
        let walmartGen = await inquirer.prompt([
          {
            type: "input",
            name: "catchall",
            message: "Catchall:",
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < walmartGen.taskQty; i++) {
          saved.push({
            id: uuidv4(),
            module: "Walmart",
            catchall: walmartGen.catchall,
            useProxies: walmartGen.useProxies,
          });
        }
        await config.set("stasis-cli.tasks", saved);
      } else if (accGenTask.action === "Target") {
        let targetGen = await inquirer.prompt([
          {
            type: "input",
            name: "catchall",
            message: "Catchall:",
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < targetGen.taskQty; i++) {
          saved.push({
            id: uuidv4(),
            module: "Target Gen",
            catchall: targetGen.catchall,
            useProxies: targetGen.useProxies,
          });
        }
        await config.set("stasis-cli.tasks", saved);
      } else if (accGenTask.action === "GMAIL") {
        let smsRegions = [
          { id: "afghanistan", label: "Afghanistan" },
          { id: "albania", label: "Albania" },
          { id: "algeria", label: "Algeria" },
          { id: "angola", label: "Angola" },
          { id: "anguilla", label: "Anguilla" },
          { id: "antiguaandbarbuda", label: "Antigua and Barbuda" },
          { id: "argentina", label: "Argentina" },
          { id: "armenia", label: "Armenia" },
          { id: "aruba", label: "Aruba" },
          { id: "australia", label: "Australia" },
          { id: "austria", label: "Austria" },
          { id: "azerbaijan", label: "Azerbaijan" },
          { id: "bahamas", label: "Bahamas" },
          { id: "bahrain", label: "Bahrain" },
          { id: "bangladesh", label: "Bangladesh" },
          { id: "barbados", label: "Barbados" },
          { id: "belarus", label: "Belarus" },
          { id: "belgium", label: "Belgium" },
          { id: "belize", label: "Belize" },
          { id: "benin", label: "Benin" },
          { id: "bhutane", label: "Bhutan" },
          { id: "bih", label: "Bosnia and Herzegovina" },
          { id: "bolivia", label: "Bolivia" },
          { id: "botswana", label: "Botswana" },
          { id: "brazil", label: "Brazil" },
          { id: "bulgaria", label: "Bulgaria" },
          { id: "burkinafaso", label: "Burkina Faso" },
          { id: "burundi", label: "Burundi" },
          { id: "cambodia", label: "Cambodia" },
          { id: "cameroon", label: "Cameroon" },
          { id: "canada", label: "Canada" },
          { id: "capeverde", label: "Cape Verde" },
          { id: "caymanislands", label: "Cayman Islands" },
          { id: "chad", label: "Chad" },
          { id: "chile", label: "Chile" },
          { id: "china", label: "China" },
          { id: "colombia", label: "Colombia" },
          { id: "comoros", label: "Comoros" },
          { id: "congo", label: "Congo" },
          { id: "costarica", label: "Costa Rica" },
          { id: "croatia", label: "Croatia" },
          { id: "cyprus", label: "Cyprus" },
          { id: "czech", label: "Czechia" },
          { id: "djibouti", label: "Djibouti" },
          { id: "dominica", label: "Dominica" },
          { id: "dominicana", label: "Dominican Republic" },
          { id: "easttimor", label: "East Timor" },
          { id: "ecuador", label: "Ecuador" },
          { id: "egypt", label: "Egypt" },
          { id: "england", label: "England" },
          { id: "equatorialguinea", label: "Equatorial Guinea" },
          { id: "eritrea", label: "Eritrea" },
          { id: "estonia", label: "Estonia" },
          { id: "ethiopia", label: "Ethiopia" },
          { id: "finland", label: "Finland" },
          { id: "france", label: "France" },
          { id: "frenchguiana", label: "French Guiana" },
          { id: "gabon", label: "Gabon" },
          { id: "gambia", label: "Gambia" },
          { id: "georgia", label: "Georgia" },
          { id: "germany", label: "Germany" },
          { id: "ghana", label: "Ghana" },
          { id: "greece", label: "Greece" },
          { id: "grenada", label: "Grenada" },
          { id: "guadeloupe", label: "Guadeloupe" },
          { id: "guatemala", label: "Guatemala" },
          { id: "guinea", label: "Guinea" },
          { id: "guineabissau", label: "Guinea-Bissau" },
          { id: "guyana", label: "Guyana" },
          { id: "haiti", label: "Haiti" },
          { id: "honduras", label: "Honduras" },
          { id: "hongkong", label: "Hong Kong" },
          { id: "hungary", label: "Hungary" },
          { id: "india", label: "India" },
          { id: "indonesia", label: "Indonesia" },
          { id: "ireland", label: "Ireland" },
          { id: "israel", label: "Israel" },
          { id: "italy", label: "Italy" },
          { id: "ivorycoast", label: "Ivory Coast" },
          { id: "jamaica", label: "Jamaica" },
          { id: "japan", label: "Japan" },
          { id: "jordan", label: "Jordan" },
          { id: "kazakhstan", label: "Kazakhstan" },
          { id: "kenya", label: "Kenya" },
          { id: "kuwait", label: "Kuwait" },
          { id: "kyrgyzstan", label: "Kyrgyzstan" },
          { id: "laos", label: "Laos" },
          { id: "latvia", label: "Latvia" },
          { id: "lesotho", label: "Lesotho" },
          { id: "liberia", label: "Liberia" },
          { id: "lithuania", label: "Lithuania" },
          { id: "luxembourg", label: "Luxembourg" },
          { id: "macau", label: "Macau" },
          { id: "madagascar", label: "Madagascar" },
          { id: "malawi", label: "Malawi" },
          { id: "malaysia", label: "Malaysia" },
          { id: "maldives", label: "Maldives" },
          { id: "mauritania", label: "Mauritania" },
          { id: "mauritius", label: "Mauritius" },
          { id: "mexico", label: "Mexico" },
          { id: "moldova", label: "Moldova" },
          { id: "mongolia", label: "Mongolia" },
          { id: "montenegro", label: "Montenegro" },
          { id: "montserrat", label: "Montserrat" },
          { id: "morocco", label: "Morocco" },
          { id: "mozambique", label: "Mozambique" },
          { id: "myanmar", label: "Myanmar" },
          { id: "namibia", label: "Namibia" },
          { id: "nepal", label: "Nepal" },
          { id: "netherlands", label: "Netherlands" },
          { id: "newcaledonia", label: "New Caledonia" },
          { id: "newzealand", label: "New Zealand" },
          { id: "nicaragua", label: "Nicaragua" },
          { id: "niger", label: "Niger" },
          { id: "nigeria", label: "Nigeria" },
          { id: "northmacedonia", label: "North Macedonia" },
          { id: "norway", label: "Norway" },
          { id: "oman", label: "Oman" },
          { id: "pakistan", label: "Pakistan" },
          { id: "panama", label: "Panama" },
          { id: "papuanewguinea", label: "Papua New Guinea" },
          { id: "paraguay", label: "Paraguay" },
          { id: "peru", label: "Peru" },
          { id: "philippines", label: "Philippines" },
          { id: "poland", label: "Poland" },
          { id: "portugal", label: "Portugal" },
          { id: "puertorico", label: "Puerto Rico" },
          { id: "reunion", label: "Reunion" },
          { id: "romania", label: "Romania" },
          { id: "russia", label: "Russia" },
          { id: "rwanda", label: "Rwanda" },
          { id: "saintkittsandnevis", label: "Saint Kitts and Nevis" },
          { id: "saintlucia", label: "Saint Lucia" },
          {
            id: "saintvincentandgrenadines",
            label: "Saint Vincent and the Grenadines",
          },
          { id: "salvador", label: "El Salvador" },
          { id: "samoa", label: "Samoa" },
          { id: "saotomeandprincipe", label: "Sao Tome and Principe" },
          { id: "saudiarabia", label: "Saudi Arabia" },
          { id: "senegal", label: "Senegal" },
          { id: "serbia", label: "Serbia" },
          { id: "seychelles", label: "Republic of Seychelles" },
          { id: "sierraleone", label: "Sierra Leone" },
          { id: "singapore", label: "Singapore" },
          { id: "slovakia", label: "Slovakia" },
          { id: "slovenia", label: "Slovenia" },
          { id: "solomonislands", label: "Solomon Islands" },
          { id: "southafrica", label: "South Africa" },
          { id: "spain", label: "Spain" },
          { id: "srilanka", label: "Sri Lanka" },
          { id: "suriname", label: "Suriname" },
          { id: "swaziland", label: "Swaziland" },
          { id: "sweden", label: "Sweden" },
          { id: "switzerland", label: "Switzerland" },
          { id: "taiwan", label: "Taiwan" },
          { id: "tajikistan", label: "Tajikistan" },
          { id: "tanzania", label: "Tanzania" },
          { id: "thailand", label: "Thailand" },
          { id: "tit", label: "Trinidad and Tobago" },
          { id: "togo", label: "Togo" },
          { id: "tonga", label: "Tonga" },
          { id: "tunisia", label: "Tunisia" },
          { id: "turkey", label: "Turkey" },
          { id: "turkmenistan", label: "Turkmenistan" },
          { id: "turksandcaicos", label: "Turks and Caicos Islands" },
          { id: "uganda", label: "Uganda" },
          { id: "ukraine", label: "Ukraine" },
          { id: "uruguay", label: "Uruguay" },
          { id: "usa", label: "USA" },
          { id: "uzbekistan", label: "Uzbekistan" },
          { id: "venezuela", label: "Venezuela" },
          { id: "vietnam", label: "Vietnam" },
          { id: "virginislands", label: "British Virgin Islands" },
          { id: "zambia", label: "Zambia" },
          { id: "zimbabwe", label: "Zimbabwe" },
        ];
        let gmailGen = await inquirer.prompt([
          {
            type: "list",
            name: "smsProvider",
            message: "SMS Provider:",
            choices: ["5sim"],
          },
          {
            type: "list",
            name: "smsRegion",
            message: "SMS Region:",
            choices: smsRegions.map((x) => {
              return { name: x.label, value: x.id };
            }),
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < gmailGen.taskQty; i++) {
          saved.push({
            id: uuidv4(),
            module: "GMAIL",
            smsRegion: gmailGen.smsRegion,
            useProxies: gmailGen.useProxies,
            smsProvider: gmailGen.smsProvider,
          });
        }
        await config.set("stasis-cli.tasks", saved);
      } else if (accGenTask.action === "eBay") {
        let savedImap = config.get("stasis-cli.imap");
        if (savedImap.length === 0) {
          global.logThis("No IMAP saved.", "error");
          await global.sleep(1500);
          global.runMain();
        } else {
          let ebayGen = await inquirer.prompt([
            {
              type: "input",
              name: "catchall",
              message: "Catchall:",
            },
            {
              type: "input",
              name: "taskQty",
              message: "How many tasks would you like to create?",
            },
            {
              type: "list",
              name: "imap",
              message: "IMAP Account:",
              choices: savedImap.map((x) => x.email),
            },
            {
              type: "confirm",
              name: "useProxies",
              message: "Use proxies?",
            },
          ]);
          let saved = config.get("stasis-cli.tasks");
          for (let i = 0; i < ebayGen.taskQty; i++) {
            saved.push({
              id: uuidv4(),
              module: "eBay Gen",
              catchall: ebayGen.catchall,
              imap: ebayGen.imap,
              useProxies: ebayGen.useProxies,
            });
          }
          await config.set("stasis-cli.tasks", saved);
        }
      } else if (accGenTask.action === "Twitter") {
        let savedImap = config.get("stasis-cli.imap");
        if (savedImap.length === 0) {
          global.logThis("No IMAP saved.", "error");
          await global.sleep(1500);
          global.runMain();
        } else {
          let twitterGen = await inquirer.prompt([
            {
              type: "input",
              name: "catchall",
              message: "Catchall:",
            },
            {
              type: "list",
              name: "imap",
              message: "IMAP Account:",
              choices: savedImap.map((x) => x.email),
            },
            {
              type: "list",
              name: "captchaSolver",
              message: "Captcha Solver:",
              choices: ["2Captcha", "CapSolver", "CapMonster"],
            },
            {
              type: "input",
              name: "taskQty",
              message: "How many tasks would you like to create?",
            },
            {
              type: "confirm",
              name: "useProxies",
              message: "Use proxies?",
            },
          ]);
          let saved = config.get("stasis-cli.tasks");
          for (let i = 0; i < twitterGen.taskQty; i++) {
            saved.push({
              id: uuidv4(),
              module: "Twitter",
              imap: twitterGen.imap,
              catchall: twitterGen.catchall,
              captchaSolver: twitterGen.captchaSolver,
              useProxies: twitterGen.useProxies,
            });
          }
          await config.set("stasis-cli.tasks", saved);
        }
      } else if (accGenTask.action === "Outlook") {
        let outlookGen = await inquirer.prompt([
          {
            type: "list",
            name: "captchaSolver",
            message: "Captcha Solver:",
            choices: ["2Captcha", "CapSolver", "CapMonster"],
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < outlookGen.taskQty; i++) {
          saved.push({
            id: uuidv4(),
            module: "Outlook",
            captchaSolver: outlookGen.captchaSolver,
            useProxies: outlookGen.useProxies,
          });
        }
        await config.set("stasis-cli.tasks", saved);
      }
    } else if (moduleCat.action === "Food Deals") {
      let accGenTask = await inquirer.prompt([
        {
          type: "list",
          name: "action",
          message: "Select Deal:",
          choices: ["Krispy Kreme", "California Pizza Kitchen"],
        },
      ]);

      if (accGenTask.action === "California Pizza Kitchen") {
        let cpkTask = await inquirer.prompt([
          {
            type: "input",
            name: "catchall",
            message: "Catchall:",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < cpkTask.taskQty; i++) {
          let newTask = {
            id: uuidv4(),
            catchall: cpkTask.catchall,
            module: "California Pizza Kitchen",
            useProxies: cpkTask.useProxies,
          };
          saved.push(newTask);
        }

        await config.set("stasis-cli.tasks", saved);
      } else if (accGenTask.action === "Krispy Kreme") {
        let kkTask = await inquirer.prompt([
          {
            type: "input",
            name: "catchall",
            message: "Catchall:",
          },
          {
            type: "confirm",
            name: "useProxies",
            message: "Use proxies?",
          },
          {
            type: "list",
            name: "captchaSolver",
            message: "Select captcha solver:",
            choices: ["2Captcha", "CapSolver", "CapMonster"],
          },
          {
            type: "input",
            name: "taskQty",
            message: "How many tasks would you like to create?",
          },
        ]);
        let saved = config.get("stasis-cli.tasks");
        for (let i = 0; i < kkTask.taskQty; i++) {
          let newTask = {
            id: uuidv4(),
            catchall: kkTask.catchall,
            module: "Krispy Kreme",
            useProxies: kkTask.useProxies,
            captchaSolver: kkTask.captchaSolver,
          };
          saved.push(newTask);
        }

        await config.set("stasis-cli.tasks", saved);
        global.logThis("Tasks created successfully.", "success");
      }
    }
    await global.sleep(1500);
    global.runMain();
  } else if (response.taskManagerAction === "View all tasks") {
    let saved = config.get("stasis-cli.tasks");
    if (saved.length > 0) {
      global.logThis(`Total tasks saved: ${saved.length}`, "warn");
      let meSniperTasks = saved.filter((x) => x.module === "Magic Eden Sniper");
      let fffTasks = saved.filter((x) => x.module === "FFF Sniper");
      let raydiumTasks = saved.filter((x) => x.module === "Raydium Sniper");
      let outlookTasks = saved.filter((x) => x.module === "Outlook");
      let walmartTasks = saved.filter((x) => x.module === "Walmart");
      let targetGenTasks = saved.filter((x) => x.module === "Target Gen");
      let shopifyTasks = saved.filter((x) => x.module === "Shopify");
      let ebayGenTasks = saved.filter((x) => x.module === "eBay Gen");
      let twitterTasks = saved.filter((x) => x.module === "Twitter");
      let gmailTasks = saved.filter((x) => x.module === "GMAIL");
      let cpkTasks = saved.filter(
        (x) => x.module === "California Pizza Kitchen"
      );
      let kkTasks = saved.filter((x) => x.module === "Krispy Kreme");

      if (meSniperTasks.length > 0) {
        global.logThis(
          `---- Magic Eden Sniper Tasks (${meSniperTasks.length}) ----`,
          "info"
        );
        console.table(
          meSniperTasks.map((x) => {
            return {
              module: x.module,
              collection: x.collection,
              maxPrice: x.maxPrice,
              maxRank: x.rankConfig.maxRank || "N/A",
              maxRankProvider: x.rankConfig.provider || "N/A",
              mode: x.mode,
              royalty: x.royalty,
              useProxies: x.useProxies,
            };
          }),
          [
            "module",
            "collection",
            "maxPrice",
            "maxRank",
            "maxRankProvider",
            "mode",
            "royalty",
            "useProxies",
          ]
        );
      }
      if (fffTasks.length > 0) {
        global.logThis(
          `---- Famous Foxes Token Sniper Tasks (${fffTasks.length}) ----`,
          "info"
        );
        console.table(
          fffTasks.map((x) => {
            return {
              module: x.module,
              token: x.token,
              maxPrice: x.maxPrice,
              wallet: x.wallet,
              rpc: x.rpc,
              useProxies: x.useProxies,
            };
          }),
          ["module", "token", "maxPrice", "wallet"]
        );
      }
      if (raydiumTasks.length > 0) {
        global.logThis(
          `---- Raydium Sniper Tasks (${raydiumTasks.length}) ----`,
          "info"
        );
        console.table(
          raydiumTasks.map((x) => {
            return {
              module: x.module,
              token: x.token,
              swapAmount: x.swapAmount,
              swapFrom: x.swapFrom,
              wallet: x.wallet,
              rpc: x.rpc,
              slippage: x.slippage,
            };
          }),
          ["module", "token", "slippage", "swapAmount", "swapFrom"]
        );
      }
      if (targetGenTasks.length > 0) {
        global.logThis(
          `---- Target Account Generator Tasks (${targetGenTasks.length}) ----`,
          "info"
        );
        console.table(targetGenTasks, ["module", "catchall", "useProxies"]);
      }
      if (cpkTasks.length > 0) {
        global.logThis(
          `---- California Pizza Kitchen Tasks (${cpkTasks.length}) ----`,
          "info"
        );
        console.table(cpkTasks, ["module", "catchall", "useProxies"]);
      }
      if (kkTasks.length > 0) {
        global.logThis(
          `---- Krispy Kreme Tasks (${kkTasks.length}) ----`,
          "info"
        );
        console.table(kkTasks, [
          "module",
          "catchall",
          "captchaSolver",
          "useProxies",
        ]);
      }
      if (outlookTasks.length > 0) {
        global.logThis(
          `---- Outlook Tasks (${outlookTasks.length}) ----`,
          "info"
        );
        console.table(outlookTasks, ["module", "captchaSolver", "useProxies"]);
      }
      if (walmartTasks.length > 0) {
        global.logThis(
          `---- Walmart Tasks (${walmartTasks.length}) ----`,
          "info"
        );
        console.table(walmartTasks, ["module", "catchall", "useProxies"]);
      }
      if (shopifyTasks.length > 0) {
        global.logThis(
          `---- Shopify Tasks (${shopifyTasks.length}) ----`,
          "info"
        );
        console.table(shopifyTasks, [
          "module",
          "site",
          "catchall",
          "useProxies",
        ]);
      }
      if (ebayGenTasks.length > 0) {
        global.logThis(
          `---- eBay Account Generator Tasks (${ebayGenTasks.length}) ----`,
          "info"
        );
        console.table(ebayGenTasks, [
          "module",
          "catchall",
          "imap",
          "useProxies",
        ]);
      }
      if (twitterTasks.length > 0) {
        global.logThis(
          `---- Twitter Account Generator Tasks (${twitterTasks.length}) ----`,
          "info"
        );
        console.table(twitterTasks, [
          "module",
          "catchall",
          "imap",
          "captchaSolver",
          "useProxies",
        ]);
      }
      if (gmailTasks.length > 0) {
        global.logThis(
          `---- GMAIL Account Generator Tasks (${gmailTasks.length}) ----`,
          "info"
        );
        console.table(gmailTasks, [
          "module",
          "smsProvider",
          "smsRegion",
          "useProxies",
        ]);
      }
    } else {
      global.logThis("No tasks saved", "error");
      await global.sleep(1500);
      global.runMain();
    }
  } else if (response.taskManagerAction === "Clear all tasks") {
    global.logThis("Clearing all tasks...", "info");
    let saved = config.get("stasis-cli.tasks");
    saved = [];
    config.set("stasis-cli.tasks", saved);
    global.logThis("Cleared all tasks", "success");
    await global.sleep(1500);
    global.runMain();
  } else if (response.taskManagerAction === "Go Back") {
    global.runMain();
  }
};

module.exports = {
  handleTasksManager,
};
