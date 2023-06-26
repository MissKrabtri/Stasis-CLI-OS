const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const anchor = require("@project-serum/anchor");
const { handleTLS } = require(`../../../../tls/tls.js`);
const template = require(`../../template.js`);
const {
  Connection,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const { decryptSecretKey } = require(`../../../../utils.js`);
const Conf = require("conf");
const config = new Conf("stasis-cli");
const { TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const c = require("./c.json");

module.exports = class Sniper extends template {
  constructor(task) {
    super(task);
    this.task = task;
    this.token = this.task.token;
    this.maxPrice = this.task.maxPrice;
    this.first_run = true;
    this.FFF_RPC_URL =
      "https://solana-api.syndica.io/access-token/obIFMM3mBzp9BC6xpHfekk3XYIxBAt9C3ziuLAduG39eJiycsTIv2f7yMyGxXBr2/rpc";
    this.FFF_TOKEN_MARKET_PROGRAM =
      "8BYmYs3zsBhftNELJdiKsCN2WyCBbrTwXd6WG4AFPr6n";
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
    this.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID = new anchor.web3.PublicKey(
      "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
    );
    this.TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
      "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
    );
    this.foxy = new anchor.web3.PublicKey(
      "FoXyMu5xwXre7zEoSvzViRk3nGawHUp9kUh97y2NDhcq"
    );
    this.program = await this.getProgram();
  }

  async run() {
    this.log("Task started...", "info");
    await this.init();
    let sniping = false;
    do {
      try {
        this.log("Monitoring token listings...", "info");
        let tokenListings = await this.getTokenListings();
        let filteredListings = tokenListings.filter(
          (x) =>
            x.mint === this.token && x.cost / LAMPORTS_PER_SOL <= this.maxPrice
        );
        this.log(
          `Successfully found *${filteredListings.length}* listing(s) with max price ${this.maxPrice} SOL!`
        );
        let walletBalance = await this.connection.getBalance(
          this.wallet.publicKey
        );
        if (filteredListings.length > 0) {
          let listing = filteredListings[0];
          let formatedPrice = listing.cost / LAMPORTS_PER_SOL;
          let canAfford = walletBalance > formatedPrice;
          if (canAfford) {
            sniping = true;
            this.log(`Sniping token...`, "warn");
            let item = await this.getItem(
              new anchor.web3.PublicKey(listing.mint),
              new anchor.web3.PublicKey(listing.owner)
            );
            let instructions = this.program.instruction.buyItem(
              new anchor.BN(1),
              new anchor.BN(listing.cost),
              {
                accounts: {
                  item: item,
                  signer: this.wallet.publicKey,
                  owner: new anchor.web3.PublicKey(listing.owner),
                  mint: new anchor.web3.PublicKey(listing.mint),
                  payment: new anchor.web3.PublicKey(
                    "2x3yujqB7LCMdCxV7fiZxPZStNy7RTYqWLSvnqtqjHR6"
                  ),
                  fuckoff: new anchor.web3.PublicKey(
                    "2x3yujqB7LCMdCxV7fiZxPZStNy7RTYqWLSvnqtqjHR6"
                  ),
                  mintUserAccount: await this.getTokenWallet(
                    this.wallet.publicKey,
                    new anchor.web3.PublicKey(listing.mint)
                  ),
                  mintMarketAccount: await this.getTokenWallet(
                    item,
                    new anchor.web3.PublicKey(listing.mint)
                  ),
                  foxy: this.foxy,
                  sellerFoxyAccount: await this.getTokenWallet(
                    new anchor.web3.PublicKey(listing.owner),
                    this.foxy
                  ),
                  buyerFoxyAccount: await this.getTokenWallet(
                    this.wallet.publicKey,
                    this.foxy
                  ),
                  associatedTokenProgram:
                    this.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID,
                  tokenProgram: TOKEN_PROGRAM_ID,
                  systemProgram: SystemProgram.programId,
                  rent: SYSVAR_RENT_PUBKEY,
                },
              }
            );
            let transaction = new Transaction();
            transaction.add(instructions);
            transaction.feePayer = this.wallet.payer.publicKey;
            transaction.recentBlockhash = (
              await this.connection.getLatestBlockhash("finalized")
            ).blockhash;
            await this.wallet.signTransaction(transaction);
            this.log("Transaction sent...", "warn");
            // console.log(await this.connection.simulateTransaction(transaction));
            let rawTxn = transaction.serialize();
            let tx = await this.connection.sendRawTransaction(rawTxn, {
              skipPreflight: true,
            });
            this.log("Waiting for confirmation...", "warn");
            let status = await this.connection.confirmTransaction(tx, {
              commitment: "confirmed",
            });
            if (status.value.err) {
              this.log(`Snipe Failure: ${status.value.err}`, "error");
            } else {
              this.log(`Snipe Success: ${tx}`, "success");
              await this.sendWebhook({
                title: "Snipe Success",
                description: `View transaction on [Solscan](https://solscan.io/tx/${tx})`,
                fields: [
                  {
                    name: "Module",
                    value: "Famous Foxes Federation Token Sniper",
                    inline: true,
                  },
                  {
                    name: "Token",
                    value: this.token,
                    inline: true,
                  },
                  {
                    name: "Wallet",
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
          } else {
            this.log("Add SOL to your wallet to snipe this token!", "error");
            await this.sleep(10000);
          }
        }
      } catch (e) {
        this.log(e.message, "error");
      } finally {
        if (sniping === false) {
          await sleep(2000);
        }
      }
    } while (sniping === false);
  }

  //
  //   UTILS
  //
  async getProgram() {
    const r = new anchor.AnchorProvider(this.connection, this.wallet, {
      preflightCommitment: "recent",
    });

    return new anchor.Program(
      JSON.parse(Buffer.from(c.data, "base64")),
      new anchor.web3.PublicKey(this.FFF_TOKEN_MARKET_PROGRAM),
      r
    );
  }

  async getItem(tokenMint, owner) {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [tokenMint.toBuffer(), Buffer.from("item"), owner.toBuffer()],
        new anchor.web3.PublicKey(this.FFF_TOKEN_MARKET_PROGRAM)
      )
    )[0];
  }

  async getTokenWallet(buyer, token) {
    return (
      await anchor.web3.PublicKey.findProgramAddress(
        [buyer.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), token.toBuffer()],
        this.SPL_ASSOCIATED_TOKEN_ACCOUNT_PROGRAM_ID
      )
    )[0];
  }

  async getNamedListings() {
    let { body } = await handleTLS({
      method: "GET",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0",
        accept: "*/*",
        "accept-language": "en-US,en;q=0.5",
        "accept-encoding": "gzip, deflate, br",
        referer: "https://famousfoxes.com/",
        origin: "https://famousfoxes.com",
        connection: "keep-alive",
        TE: "trailers",
        "tls-url": `https://dens.famousfoxes.com/whitelist.json`,
        "tls-allowredirect": "false",
      },
      responseType: "json",
    });
    return body;
  }

  async getTokenListings() {
    let { body } = await handleTLS({
      method: "GET",
      headers: {
        authority: "dens.famousfoxes.com",
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9",
        "cache-control": "max-age=0",
        origin: "https://famousfoxes.com",
        referer: "https://famousfoxes.com/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
        "tls-url": "https://dens.famousfoxes.com/cache.json",
        "tls-allowredirect": "false",
      },
      responseType: "json",
    });
    return body;
  }

  async getTokenSales(tokenAddress) {
    let { body } = await handleTLS({
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:100.0) Gecko/20100101 Firefox/100.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://famousfoxes.com/tokenmarket",
        Connection: "keep-alive",
        TE: "trailers",
        "tls-url": `https://famousfoxes.com/api/getSalesByAddress/${tokenAddress}`,
        "tls-allowredirect": "false",
      },
      responseType: "json",
    });
    return body;
  }
};
