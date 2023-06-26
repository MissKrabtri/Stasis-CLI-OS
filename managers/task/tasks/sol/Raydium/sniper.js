const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const anchor = require("@project-serum/anchor");
const template = require(`../../template.js`);
const { Connection, Keypair } = require("@solana/web3.js");
const { decryptSecretKey } = require(`../../../../utils.js`);
const {
  jsonInfo2PoolKeys,
  Liquidity,
  TokenAmount,
  Token,
  Percent,
  TOKEN_PROGRAM_ID,
  SPL_ACCOUNT_LAYOUT,
} = require("@raydium-io/raydium-sdk");
const Conf = require("conf");
const config = new Conf("stasis-cli");
const got = require("got");

module.exports = class Sniper extends template {
  constructor(task) {
    super(task);
    this.task = task;
    this.token = this.task.token;
    this.swapFrom =
      this.task.swapFrom === "USDC"
        ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
        : "So11111111111111111111111111111111111111112";
    this.swapAmount = this.task.swapAmount;
    this.slippage = this.task.slippage;
    this.first_run = true;
    this.raydiumLiquidityPool =
      "https://api.raydium.io/v2/sdk/liquidity/mainnet.json";
  }

  async init() {
    this.connection = new Connection(this.task.rpc);
    let c = config.get("stasis-cli.wallets");
    let found = c.find((w) => w.publicKey === this.task.wallet);
    if (found.encrypted === true) {
      let decryptPk = decryptSecretKey(found.secretKey, "YourCustomPassword");
      let secretKeyDecryptedStr = Buffer.from(decryptPk).toString("hex");
      let secretKeyUint8Array = new Uint8Array(
        secretKeyDecryptedStr.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );
      this.wallet = new anchor.Wallet(
        Keypair.fromSecretKey(secretKeyUint8Array)
      );
    } else {
      let keyArray = new Uint8Array(
        found.secretKey.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
      );
      this.wallet = new anchor.Wallet(
        Keypair.fromSecretKey(Buffer.from(keyArray))
      );
    }
    this.metaplex = Metaplex.make(this.connection);
    this.metaplex.use(keypairIdentity(this.wallet.payer));
    this.provider = new anchor.AnchorProvider(this.connection, this.wallet, {
      commitment: "processed",
    });
  }

  async run() {
    this.log("Task started...", "info");
    this.log("Initializing...", "info");
    this.log(
      "Be aware, this build of StasisNFT does not offer routing.",
      "warn"
    );
    await this.init();
    let sniping = false;
    do {
      try {
        this.log("Getting liquidity pools...", "info");
        let { keys, json } = await this.getPoolInfo(this.swapFrom, this.token);
        if (keys) {
          sniping = true;
          this.log("Liquidity Pools found...", "info");
          this.log(`Sniping token...`, "warn");
          await this.snipe(keys);
        } else {
          this.log("Waiting for liquidity pools...", "info");
          await this.sleep(10000);
        }
      } catch (e) {
        this.log(e.message, "error");
        await this.sleep(10000);
      }
    } while (sniping === false);
  }

  async snipe(keys) {
    let owner = this.wallet.publicKey;
    let poolInfo = await Liquidity.fetchInfo({
      connection: this.connection,
      poolKeys: keys,
    });
    // const startTime = new Date(poolInfo.startTs * 1000);
    // console.log(poolInfo.startTime.toNumber());
    const amountIn = new TokenAmount(
      new Token(keys.baseMint, poolInfo.baseDecimals),
      this.swapAmount, // User amount to swap
      false
    );
    const currencyOut = new Token(keys.quoteMint, poolInfo.quoteDecimals);
    const slippage = new Percent(this.slippage, 100); // Custom slippage tolerance of 1%
    const {
      amountOut,
      minAmountOut,
      currentPrice,
      executionPrice,
      priceImpact,
      fee,
    } = Liquidity.computeAmountOut({
      poolKeys: keys,
      poolInfo,
      amountIn,
      currencyOut,
      slippage,
    });

    // console.log(
    //   `swap: ${keys.id.toBase58()}, amountIn: ${amountIn.toFixed()}, amountOut: ${amountOut.toFixed()}, executionPrice: ${executionPrice.toFixed()}`
    // );
    let tokenAccounts = await this.getTokenAccountsByOwner(
      this.connection,
      owner
    );
    this.log(`Sending transaction...`, "warn");
    const { transaction, signers } = await Liquidity.makeSwapTransaction({
      connection: this.connection,
      poolKeys: keys,
      userKeys: {
        tokenAccounts,
        owner,
      },
      amountIn,
      amountOut: minAmountOut,
      fixedSide: "in",
    });
    transaction.recentBlockhash = (
      await this.connection.getLatestBlockhash("confirmed")
    ).blockhash;
    transaction.feePayer = this.wallet.publicKey;
    if (signers.length > 0) {
      transaction.sign(...signers);
    }
    this.wallet.signTransaction(transaction);
    const rawTransaction = transaction.serialize();
    let tx = await this.connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed",
    });
    this.log(`Transaction Sent: ${tx}`, "warn");
    this.log("Confirming transaction...", "warn");
    let status = await this.connection.confirmTransaction(tx, {
      commitment: "confirmed",
    });
    if (status.value.err) {
      this.log(`Snipe Failure: ${status.value.err}`, "error");
    } else {
      this.log(`Transaction Confirmed: ${tx}`, "success");
      await this.sendWebhook({
        title: "Raydium ---> Buy Success",
        description: `View transaction on [Solscan](https://solscan.io/tx/${tx})`,
        fields: [
          {
            name: "Module",
            value: "Raydium Token Sniper",
            inline: true,
          },
          {
            name: "Token to snipe",
            value: this.token,
            inline: true,
          },
          {
            name: "Slippage",
            value: this.slippage.toString() + "%",
            inline: true,
          },
          {
            name: "From",
            value: this.task.swapFrom + " ->",
            inline: false,
          },
          {
            name: "Buy Amount",
            value: this.swapAmount.toString() + " " + this.task.swapFrom,
            inline: true,
          },
          {
            name: "Payment Wallet",
            value: this.wallet.publicKey.toString(),
            inline: false,
          },
          {
            name: "RPC Endpoint",
            value: this.task.rpc,
            inline: false,
          },
        ],
      });
    }

    await this.sleep(10000);
  }

  //
  //   UTILS
  //
  async getLiquidityPoolInfo() {
    let { body } = await got(this.raydiumLiquidityPool, {
      responseType: "json",
    });

    let arr = [];
    arr = [...body.official];
    arr = [...arr, ...body.unOfficial];

    return arr;
  }

  async getPoolInfo(token1, token2) {
    let pools = await this.getLiquidityPoolInfo();
    let poolPair = pools.find(
      (item) => item.baseMint === token1 && item.quoteMint === token2
    );
    let poolKeys = jsonInfo2PoolKeys(poolPair);
    return {
      json: poolPair,
      keys: poolKeys,
    };
  }

  async getTokenAccountsByOwner(connection, owner) {
    const tokenResp = await connection.getTokenAccountsByOwner(owner, {
      programId: TOKEN_PROGRAM_ID,
    });

    const accounts = [];

    for (const { pubkey, account } of tokenResp.value) {
      accounts.push({
        pubkey,
        accountInfo: SPL_ACCOUNT_LAYOUT.decode(account.data),
      });
    }

    return accounts;
  }
};
