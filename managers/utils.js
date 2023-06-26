const CryptoJS = require("crypto-js");
const chalk = require("chalk");
const { Webhook, MessageBuilder } = require("discord-webhook-node");
const {
  PublicKey,
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} = require("@solana/web3.js");
const crypto = require("crypto");
const Web3 = require("web3");
const bs58 = require("bs58");
const fs = require("fs").promises;
const path = require("path");
const { handleTLS } = require(`./tls/tls.js`);
const { version } = require("../package.json");

const defaultConfig = {
  licenseKey: "",
  tasks: [],
  webhooks: [],
  wallets: [],
  rpc: [],
  sessions: [],
  profiles: [],
  imap: [],
  proxies: [],
  sms: {
    fivesim: "",
    smsactivate: "",
  },
  captcha: {
    twocaptcha: "",
    capmonster: "",
    capsolver: "",
  },
};

const encrypt = (content, password) => {
  return CryptoJS.AES.encrypt(JSON.stringify({ content }), password).toString();
};

const decrypt = (crypted, password) => {
  return JSON.parse(
    CryptoJS.AES.decrypt(crypted, password).toString(CryptoJS.enc.Utf8)
  ).content;
};

const logLogo = () => {
  console.log(
    chalk.blueBright(
      `
███████╗████████╗ █████╗ ███████╗██╗███████╗     █████╗ ██╗ ██████╗ 
██╔════╝╚══██╔══╝██╔══██╗██╔════╝██║██╔════╝    ██╔══██╗██║██╔═══██╗
███████╗   ██║   ███████║███████╗██║███████╗    ███████║██║██║   ██║
╚════██║   ██║   ██╔══██║╚════██║██║╚════██║    ██╔══██║██║██║   ██║
███████║   ██║   ██║  ██║███████║██║███████║    ██║  ██║██║╚██████╔╝
╚══════╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝╚══════╝    ╚═╝  ╚═╝╚═╝ ╚═════╝ 
`
    )
  );
  console.log(chalk.bgBlueBright("v" + version));
};

const testWebhook = async (hookURL) => {
  const hook = new Webhook(hookURL);

  const embed = new MessageBuilder()
    .setTitle("This is a test Webhook")
    .setAuthor(
      "Stasis NFT",
      "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
      "https://www.stasislabs.gg"
    )
    .setURL("https://www.stasislabs.gg")
    .setColor("#161620")
    .setDescription("Your webhook is working!")
    .setFooter(
      "Stasis NFT",
      "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500"
    )
    .setTimestamp();
  hook.setAvatar(
    "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500"
  );
  hook.setUsername("Stasis NFT");
  await hook.send(embed);
};

const sendWebhook = async (obj) => {
  const hook = new Webhook(obj.hookURL);

  const embed = new MessageBuilder();
  if (obj.title) {
    embed.setTitle(obj.title);
  }
  if (obj.description) {
    embed.setDescription(obj.description);
  }
  if (obj.fields) {
    for (let field of obj.fields) {
      embed.addField(field.name, field.value, field.inline);
    }
  }
  embed.setAuthor(
    "Stasis CLI",
    "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500",
    "https://www.stasislabs.gg"
  );
  if (obj.url) {
    embed.setURL(obj.url);
  }
  embed.setColor("#161620");
  embed.setFooter(
    "Stasis CLI",
    "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500"
  );
  if (obj.thumbnail) {
    embed.setThumbnail(obj.thumbnail);
  }
  if (obj.image) {
    embed.setImage(obj.image);
  }
  embed.setTimestamp();
  hook.setAvatar(
    "https://media.discordapp.net/attachments/994370578997858385/1119883067977367603/Logo.jpg?width=500&height=500"
  );
  hook.setUsername("Stasis CLI");
  await hook.send(embed);
};

const testSolanaRPC = async (endpoint) => {
  let reqConfig = {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
  };
  if (endpoint.includes("wss")) {
    reqConfig.wsEndpoint = endpoint;
  }
  let connection = new Connection(
    endpoint.replaceAll("wss", "https"),
    reqConfig
  );
  let start = new Date();
  let { blockhash } = await connection.getLatestBlockhash({
    commitment: "confirmed",
  });
  let end = new Date() - start;
  return end;
};

const encryptSecretKey = (secretKey, passphrase) => {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(passphrase, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(secretKey);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    salt: salt.toString("hex"),
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
    encryptedSecretKey: encrypted.toString("hex"),
  };
};

const decryptSecretKey = (encryptedData, passphrase) => {
  const key = crypto.scryptSync(
    passphrase,
    Buffer.from(encryptedData.salt, "hex"),
    32
  );
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(encryptedData.iv, "hex")
  );
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, "hex"));

  let decrypted = decipher.update(
    Buffer.from(encryptedData.encryptedSecretKey, "hex")
  );
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return new Uint8Array(decrypted);
};

const generateSolanawallet = async (encryptPk) => {
  const wallet = Keypair.generate();
  const publicKey = wallet.publicKey;
  const secretKey = wallet.secretKey;
  return {
    publicKey: publicKey.toString(),
    secretKey:
      encryptPk === true
        ? encryptSecretKey(secretKey, "YourCustomPassword")
        : Buffer.from(secretKey).toString("hex"),
  };
};

const generateEthwallet = async (encryptPk) => {
  const web3 = new Web3();
  const wallet = web3.eth.accounts.create();
  const publicKey = wallet.address;
  const secretKey = wallet.privateKey;
  return {
    publicKey: publicKey.toString(),
    secretKey:
      encryptPk === true
        ? encryptSecretKey(secretKey, "YourCustomPassword")
        : secretKey,
  };
};

const checkSolanaBalance = async (address) => {
  let conn = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");
  let balance = await conn.getBalance(new PublicKey(address));
  return balance / LAMPORTS_PER_SOL;
};

const checkEthBalance = async (address) => {
  const providerUrl = "https://rpc.ankr.com/eth";
  const web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
  // Replace this with the Ethereum address you want to check the balance of
  let weiBalance = await web3.eth.getBalance(address);
  let ethBalance = await web3.utils.fromWei(weiBalance, "ether");
  return ethBalance;
};

const addSolanaWallet = async (pk) => {
  const secretKey = new Uint8Array(Buffer.from(bs58.decode(pk)));
  const wallet = Keypair.fromSecretKey(secretKey);
  const publicKey = wallet.publicKey;
  return {
    publicKey: publicKey.toString(),
    secretKey: encryptSecretKey(wallet.secretKey, "YourCustomPassword"),
  };
};

const exportWallets = async (wallets) => {
  let toExport = [];
  for (let wallet of wallets) {
    if (wallet.encrypted === true) {
      wallet.encrypted = undefined;
      wallet.id = undefined;
      if (wallet.type === "SOL") {
        let decryptPk = decryptSecretKey(
          wallet.secretKey,
          "YourCustomPassword"
        );
        wallet.secretKey = Buffer.from(decryptPk).toString("hex");
      } else if (wallet.type === "ETH") {
        let decryptPk = Buffer.from(
          decryptSecretKey(wallet.secretKey, "YourCustomPassword"),
          "hex"
        ).toString();
        wallet.secretKey = decryptPk;
      }
      toExport.push(wallet);
    } else {
      wallet.encrypted = undefined;
      wallet.id = undefined;
      toExport.push(wallet);
    }
  }

  const jsonData = {
    wallets: toExport,
  };

  // Convert the JSON data to a string
  const jsonString = JSON.stringify(jsonData, null, 2);

  // Define the file name and path to save the JSON file on the user's desktop
  const fileName = "stasis-cli-wallet-exports.json";
  const filePath = path.join(process.cwd(), fileName);
  // Write the JSON data to the file
  await fs.writeFile(filePath, jsonString);
  return true;
};

const getMagicEdenAttributes = async (collection) => {
  let options = {
    method: "GET",
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "ti,en-US;q=0.9,en;q=0.8",
      "cache-control": "max-age=0",
      referer: "https://magiceden.io/",
      "upgrade-insecure-requests": "1",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
      "tls-url": `https://api-mainnet.magiceden.io/rpc/getCollectionEscrowStats/${collection}?edge_cache=true`,
    },
    responseType: "json",
  };
  let { body } = await handleTLS(options);
  return body;
};

const getProxyFile = async () => {
  let p = path.join(process.cwd(), "proxies.txt");
  let contents = await fs.readFile(p, "utf8");
  if (contents.includes("ip:port:username:password")) {
    return null;
  } else {
    return contents;
  }
};

const parseProxyString = (proxy) => {
  const [ip, port, username, password] = proxy.split(":");
  if (username && password) {
    return `http://${username}:${password}@${ip}:${port}`.replace(
      /[\r\n]/g,
      ""
    );
  } else {
    return `http://${ip}:${port}`.replace(/[\r\n]/g, "");
  }
};

const getRandomProxy = async () => {
  let list = (await getProxyFile()).split("\n");
  let proxy = list[Math.floor(Math.random() * list.length)];
  let formatted = parseProxyString(proxy);
  return formatted;
};

const checkFileExists = async (path) => {
  try {
    await fs.readFile(path, "utf8");
    return true;
  } catch (e) {
    return false;
  }
};

module.exports = {
  encrypt,
  decrypt,
  defaultConfig,
  logLogo,
  testWebhook,
  testSolanaRPC,
  generateSolanawallet,
  generateEthwallet,
  encryptSecretKey,
  decryptSecretKey,
  addSolanaWallet,
  exportWallets,
  checkSolanaBalance,
  checkEthBalance,
  getMagicEdenAttributes,
  sendWebhook,
  getProxyFile,
  getRandomProxy,
  checkFileExists,
  parseProxyString,
};
