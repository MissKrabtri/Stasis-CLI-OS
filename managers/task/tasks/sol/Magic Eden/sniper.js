const { Metaplex, keypairIdentity } = require("@metaplex-foundation/js");
const anchor = require("@project-serum/anchor");
const { decodeUTF8 } = require("tweetnacl-util");
const nacl = require("tweetnacl");
const bs58 = require("bs58");
const { handleTLS } = require(`../../../../tls/tls.js`);
const template = require(`../../template.js`);
const {
  Connection,
  LAMPORTS_PER_SOL,
  Keypair,
  Transaction,
  sendAndConfirmRawTransaction,
} = require("@solana/web3.js");
const { decryptSecretKey, getProxyFile } = require(`../../../../utils.js`);
const Conf = require("conf");
const config = new Conf("stasis-cli");
const got = require("got");

module.exports = class Sniper extends template {
  constructor(task) {
    super(task);
    this.task = task;
    this.collection = this.task.collection;
    this.mode = this.task.mode;
    this.maxPrice = this.task.maxPrice;
    this.attributes = this.task.attributes;
    this.rankConfig = this.task.rankConfig;
    this.first_run = true;
    this.scraped_collection = {};
    this.royaltyPercent = this.task.royalty;
    this.useProxies = this.task.useProxies;
    this.ddCookie = null;
  }

  async init() {
    if (this.useProxies === true) {
      this.log("Checking proxy list...", "info");
      let valid = await getProxyFile();
      if (valid === null) {
        this.log("Invalid Proxy List", "error");
        await this.sleep(5000);
        return;
      } else {
        await this.setProxy();
      }
    }
    this.connection = new Connection(this.task.rpc, {
      maxSupportedTransactionVersion: 0,
    });
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
    if (this.mode === "Default") {
      await this.monitorAPI();
    } else if (this.mode === "Experimental") {
      let collection = await this.getCollectionDetails(this.collection, null);
      if (collection && collection.symbol) {
        if (
          collection.candyMachineIds &&
          collection.candyMachineIds.length > 0
        ) {
          this.cm = collection.candyMachineIds[0];
        } else {
          let listed = await this.getListedNftsByCollectionSymbol(
            this.collection
          );
          if (listed && listed.length > 0) {
            let use = listed[0];
            this.cm = await this.getFirstCreator(use.mintAddress);
          }
        }
        if (this.cm) {
          await this.monitorChain();
        } else {
          this.log("Failed to parse mint list", "error");
        }
      } else {
        this.log("Failed to parse collection details", "error");
      }
    }
  }

  async run() {
    this.log("Task started...", "info");
    await this.init();
  }

  async getCookies() {
    try {
      this.log("Solving Datadome...", "warn");
      // Replace URL with your Datadome solver
      let { body } = await got({
        method: "POST",
        url: "",
        headers: {
          "Content-Type": "application/json",
        },
        json: {
          domain: `https://magiceden.io/marketplace/${this.collection}`,
        },
        responseType: "json",
      });

      return body.cookie;
    } catch (e) {
      if (
        e.response &&
        e.response.body &&
        e.response.body.url &&
        e.response.body.url.includes("https://geo.captcha-delivery.com")
      ) {
        this.log("Blocked by Datadome, refreshing cookies...", "error");
      } else {
        this.log("Failed to solve Datadome", "error");
      }
    }
  }

  async monitorAPI() {
    let sniping = false;
    do {
      try {
        this.log("Monitoring...", "info");
        if (this.useProxies) {
          await this.setProxy();
        }
        let listings = await this.getListedNftsByCollectionSymbol(
          this.collection
        );
        let filtered = listings.filter(
          (listing) => listing.price <= this.maxPrice
        );
        if (filtered.length > 0) {
          // No filters
          if (!this.rankConfig.provider && this.attributes.length === 0) {
            let listing = filtered[Math.floor(Math.random() * filtered.length)];
            sniping = true;
            await this.snipe(listing);
          } else if (this.rankConfig.provider && this.attributes.length === 0) {
            rankFilter: for (let listing of filtered) {
              if (
                Object.keys(listing.rarity).includes(
                  this.rankConfig.provider.toLowerCase().replaceAll(" ", "")
                )
              ) {
                let rarity =
                  listing.rarity[
                    this.rankConfig.provider.toLowerCase().replaceAll(" ", "")
                  ];
                if (rarity.rank <= this.rankConfig.maxRank) {
                  await this.snipe(listing);
                  sniping = true;
                  break rankFilter;
                }
              }
            }
          } else if (this.attributes.length > 0) {
            filter: for (let listing of filtered) {
              if (listing.attributes && listing.attributes.length > 0) {
                let matched = [];
                for (let attr of listing.attributes) {
                  for (let userTrait of this.attributes) {
                    if (
                      userTrait.trait === attr.trait_type &&
                      userTrait.value === attr.value
                    ) {
                      matched.push({
                        trait: attr.trait_type,
                        value: attr.value,
                      });
                    }
                  }
                }
                if (matched.length === this.attributes.length) {
                  if (this.rankConfig.provider) {
                    if (
                      Object.keys(listing.rarity).includes(
                        this.rankConfig.provider
                          .toLowerCase()
                          .replaceAll(" ", "")
                      )
                    ) {
                      let rarity =
                        listing.rarity[
                          this.rankConfig.provider
                            .toLowerCase()
                            .replaceAll(" ", "")
                        ];
                      if (rarity.rank <= this.rankConfig.maxRank) {
                        await this.snipe(listing);
                      }
                    }
                  } else {
                    await this.snipe(listing);
                  }
                  sniping = true;
                  break filter;
                }
              }
            }
          }
        }
      } catch (e) {
        this.log(e.message, "error");
        continue;
      }
      await this.sleep(1 * 1000);
    } while (sniping === false);
  }

  async monitorChain() {
    let lastTx;
    let sniping = false;
    do {
      try {
        this.log("Monitoring...", "info");
        if (this.useProxies) {
          await this.setProxy();
        }
        let txnList = await this.connection.getSignaturesForAddress(
          new anchor.web3.PublicKey(
            "M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K"
          ),
          {
            limit: 25,
            commitment: "confirmed",
            until: lastTx,
            maxSupportedTransactionVersion: 0,
          }
        );
        let sigList = txnList.map((x) => x.signature);
        lastTx = sigList[sigList.length - 1];
        let txns = (
          await this.connection.getParsedTransactions(
            sigList.map((x) => x.toString()),
            {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            }
          )
        ).filter(
          (x) =>
            x && x.meta && x.meta.logMessages && x.meta.logMessages.length > 0
        );
        for (let tx of txns) {
          if (tx.meta && tx.meta.logMessages) {
            let logMessages = tx.meta.logMessages;
            let postTokenBalances = tx.meta.postTokenBalances;
            let isListing = logMessages.includes(
              "Program log: Instruction: Sell"
            );
            let hasPrice = logMessages.find((x) => x.includes("price"));
            if (isListing && hasPrice) {
              let priceParsed = hasPrice
                .replaceAll("Program log:", "")
                .replaceAll(" ", "");
              if (JSON.parse(priceParsed).price) {
                let price = JSON.parse(priceParsed).price / LAMPORTS_PER_SOL;
                let seller_expiry = JSON.parse(priceParsed).seller_expiry;
                if (
                  price &&
                  price <= this.maxPrice &&
                  postTokenBalances.length > 0
                ) {
                  let tokenMint = new anchor.web3.PublicKey(
                    postTokenBalances[0].mint
                  );
                  let fetchedMint = await this.metaplex.nfts().findByMint({
                    mintAddress: new anchor.web3.PublicKey(tokenMint),
                  });
                  let machine = fetchedMint.creators.find(
                    (x) => x.verified === true
                  );
                  if (machine && this.cm === machine.address.toString()) {
                    let fetchedFromMe = await this.getNFT(tokenMint.toString());
                    // No filters
                    if (
                      !this.rankConfig.provider &&
                      this.attributes.length === 0
                    ) {
                      sniping = true;
                      await this.snipe({
                        title: fetchedFromMe.title,
                        img: fetchedFromMe.img,
                        owner: fetchedFromMe.owner,
                        mintAddress: fetchedFromMe.mintAddress,
                        id: fetchedFromMe.id,
                        price: price,
                        attributes: fetchedFromMe.attributes,
                        v2: {
                          expiry: seller_expiry,
                        },
                      });
                    } else if (
                      this.rankConfig.provider &&
                      this.attributes.length === 0
                    ) {
                      if (
                        Object.keys(fetchedFromMe.rarity).includes(
                          this.rankConfig.provider
                            .toLowerCase()
                            .replaceAll(" ", "")
                        )
                      ) {
                        let rarity =
                          fetchedFromMe.rarity[
                            this.rankConfig.provider
                              .toLowerCase()
                              .replaceAll(" ", "")
                          ];
                        if (rarity.rank <= this.rankConfig.maxRank) {
                          await this.snipe({
                            title: fetchedFromMe.title,
                            img: fetchedFromMe.img,
                            owner: fetchedFromMe.owner,
                            mintAddress: fetchedFromMe.mintAddress,
                            id: fetchedFromMe.id,
                            price: price,
                            attributes: fetchedFromMe.attributes,
                            v2: {
                              expiry: seller_expiry,
                            },
                          });
                          sniping = true;
                        }
                      }
                    } else if (this.attributes.length > 0) {
                      if (
                        fetchedFromMe.attributes &&
                        fetchedFromMe.attributes.length > 0
                      ) {
                        let matched = [];
                        for (let attr of fetchedFromMe.attributes) {
                          for (let userTrait of this.attributes) {
                            if (
                              userTrait.trait === attr.trait_type &&
                              userTrait.value === attr.value
                            ) {
                              matched.push({
                                trait: attr.trait_type,
                                value: attr.value,
                              });
                            }
                          }
                        }
                        if (matched.length === this.attributes.length) {
                          if (this.rankConfig.provider) {
                            if (
                              Object.keys(fetchedFromMe.rarity).includes(
                                this.rankConfig.provider
                                  .toLowerCase()
                                  .replaceAll(" ", "")
                              )
                            ) {
                              let rarity =
                                fetchedFromMe.rarity[
                                  this.rankConfig.provider
                                    .toLowerCase()
                                    .replaceAll(" ", "")
                                ];
                              if (rarity.rank <= this.rankConfig.maxRank) {
                                await this.snipe({
                                  title: fetchedFromMe.title,
                                  img: fetchedFromMe.img,
                                  owner: fetchedFromMe.owner,
                                  mintAddress: fetchedFromMe.mintAddress,
                                  id: fetchedFromMe.id,
                                  price: price,
                                  attributes: fetchedFromMe.attributes,
                                  v2: {
                                    expiry: seller_expiry,
                                  },
                                });
                              }
                            }
                          } else {
                            await this.snipe({
                              title: fetchedFromMe.title,
                              img: fetchedFromMe.img,
                              owner: fetchedFromMe.owner,
                              mintAddress: fetchedFromMe.mintAddress,
                              id: fetchedFromMe.id,
                              price: price,
                              attributes: fetchedFromMe.attributes,
                              v2: {
                                expiry: seller_expiry,
                              },
                            });
                          }
                          sniping = true;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (e) {
        this.log(e.message, "error");
        continue;
      }
      await this.sleep(1 * 1000);
    } while (sniping === false);
  }

  //
  // UTILS
  //
  async getFirstCreator(mintAddress) {
    const nft = await this.metaplex
      .nfts()
      .findByMint({ mintAddress: new anchor.web3.PublicKey(mintAddress) });
    return nft.creators
      .filter((x) => x.verified === true)[0]
      .address.toString();
  }

  async snipe(listing) {
    this.log(`Sniping ${listing.title} for ${listing.price} SOL`, "warn");
    let obj = {
      buyer: this.wallet.publicKey.toString(),
      seller: listing.owner,
      auctionHouseAddress:
        listing.v2.auctionHouseKey ||
        "E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe",
      tokenMint: listing.mintAddress,
      tokenATA: listing.id,
      price: listing.price,
      sellerReferral:
        listing.v2.sellerReferral ||
        "autMW8SgBkVYeBgqYiTuJZnkvDZMVU2MHJh9Jh7CSQ2",
      sellerExpiry: listing.v2.expiry || 0,
    };
    let init_token = await this.initLogin(this.wallet.publicKey.toString());
    init_token = init_token.body;
    let message = init_token.message;
    let messageBytes = decodeUTF8(message);
    let signature = nacl.sign.detached(
      messageBytes,
      this.wallet.payer.secretKey
    );
    this.ddCookie = await this.getCookies();
    let browserTokenRequest = await this.verifyBrowser(
      this.wallet.publicKey.toString(),
      bs58.encode(signature).toString("base64"),
      init_token.nonce,
      init_token.token
    );
    let { browserToken } = browserTokenRequest.body;
    this.log(`Scraping Browser Token...`, "warn");
    let txn_data = await this.getBuyTxn(obj, browserToken);
    let buyTx = Transaction.from(txn_data.txSigned.data);
    await this.wallet.signTransaction(buyTx);
    let rawTxn = buyTx.serialize();
    this.log("Transaction sent...", "warn");
    // console.log(await this.connection.simulateTransaction(buyTx));
    let tx = await sendAndConfirmRawTransaction(this.connection, rawTxn, {
      commitment: "finalized",
      skipPreflight: true,
    });
    let confirmation = await this.connection.getTransaction(tx);
    if (confirmation && confirmation.meta.err) {
      this.log(
        `Transaction was confirmed but there was an error in the confirmation. ~ While sniping ${listing.title} for ${listing.price} SOL (TXN: ${tx})`,
        "error"
      );
    } else if (confirmation && !confirmation.meta.err) {
      this.log(
        `Transaction confirmed! - Sniped ${listing.title} for ${listing.price} SOL (TXN: ${tx})`,
        "success"
      );
      await this.sendWebhook({
        title: "Sniped an NFT!",
        description: `Sniped ${listing.title} for ${listing.price} SOL`,
        fields: [
          {
            name: "Collection",
            value: this.collection,
            inline: false,
          },
          {
            name: "NFT",
            value: listing.title,
            inline: true,
          },
          {
            name: "Price",
            value: listing.price.toString(),
            inline: true,
          },
          {
            name: "Mode",
            value: this.mode,
            inline: true,
          },
          {
            name: "Mint Address",
            value: listing.mintAddress,
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
        thumbnail: listing.img,
      });
    } else if (!confirmation) {
      this.log(
        `Transaction was not confirmed after 60 seconds. - Refer to solscan for details. ~ While sniping ${listing.title} for ${listing.price} SOL (TXN: ${tx})`,
        "error"
      );
    }
  }

  async getBuyTxn(listing, browserToken) {
    let options = {
      method: "GET",
      url: `http://localhost:${global.tlsPort}`,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "x-browser-session": browserToken,
        Origin: "https://magiceden.io",
        Connection: "keep-alive",
        Referer: "https://magiceden.io/",
        Cookie: this.ddCookie,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        TE: "trailers",
        "tls-url": `https://api-mainnet.magiceden.io/v2/instructions/buy_now?buyer=${listing.buyer}&seller=${listing.seller}&auctionHouseAddress=${listing.auctionHouseAddress}&tokenMint=${listing.tokenMint}&tokenATA=${listing.tokenATA}&price=${listing.price}&sellerReferral=${listing.sellerReferral}&sellerExpiry=${listing.sellerExpiry}&useV2=true&buyerCreatorRoyaltyPercent=${this.royaltyPercent}`,
      },
      responseType: "json",
    };
    if (this.proxy) {
      options.headers["tls-proxy"] = this.proxy;
    }
    let { body } = await got(options);
    return body;
  }

  async initLogin(walletAddress) {
    let options = {
      method: "POST",
      headers: {
        authority: "api-mainnet.magiceden.io",
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        authorization: "Bearer null",
        "content-type": "application/json",
        origin: "https://magiceden.io",
        referer: "https://magiceden.io/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        "tls-url": "https://api-mainnet.magiceden.io/auth/login/v2/init",
      },
      json: { address: walletAddress },
      responseType: "json",
    };
    let resp = await handleTLS(options);
    return resp;
  }

  async verifyBrowser(walletAddress, signature, nonce, initToken) {
    let options = {
      method: "POST",
      headers: {
        Cookie: this.ddCookie,
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Content-Type": "application/json",
        Authorization: "Bearer null",
        Origin: "https://magiceden.io",
        Connection: "keep-alive",
        Referer: "https://magiceden.io/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-site",
        TE: "trailers",
        "tls-url":
          "https://api-mainnet.magiceden.io/auth/verifyBrowser?chainId=solana-mainnet",
      },
      json: {
        address: walletAddress,
        signature: signature,
        nonce: nonce,
        token: initToken,
      },
      responseType: "json",
    };
    if (this.proxy) {
      options.headers["tls-proxy"] = this.proxy;
    }
    let req = await handleTLS(options);
    return req;
  }

  async getCollectionDetails(collection) {
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
        "tls-url": `https://api-mainnet.magiceden.io/collections/${collection}`,
      },
      responseType: "json",
    };
    if (this.proxy) {
      options.headers["tls-proxy"] = this.proxy;
    }
    let { body } = await handleTLS(options);
    return body;
  }

  async getNFT(mintAddress) {
    let { body } = await handleTLS({
      method: "GET",
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en-US,en;q=0.9",
        referer: "https://magiceden.io/",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        "tls-url": `https://api-mainnet.magiceden.io/rpc/getNFTByMintAddress/${mintAddress}?useRarity=true`,
      },
      responseType: "json",
    });
    if (body && body.results) {
      return body.results;
    } else {
      throw new Error("Connection error");
    }
  }

  async getNftsByOwner(address) {
    let { body } = await handleTLS({
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
        "accept-language": "ti,en-US;q=0.9,en;q=0.8",
        "cache-control": "max-age=0",
        referer: "https://magiceden.io/",
        "upgrade-insecure-requests": "1",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        "tls-url": `https://api-mainnet.magiceden.io/rpc/getNFTsByOwner/${address}`,
      },
      responseType: "json",
    });
    return body;
  }

  async getListedNftsByCollectionSymbol(collection) {
    let options = {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/112.0",
        accept: "application/json, text/plain, */*",
        "tls-url": `https://api-mainnet.magiceden.io/idxv2/getListedNftsByCollectionSymbol?collectionSymbol=${collection}&onChainCollectionAddress=&direction=2&field=3&limit=99999&offset=0&mode=all`,
      },
      responseType: "json",
    };
    if (this.proxy) {
      options.headers["tls-proxy"] = this.proxy;
    }
    let { body } = await handleTLS(options);
    if (body && body.results) {
      return body.results;
    } else {
      throw new Error("Connection error");
    }
  }
};
