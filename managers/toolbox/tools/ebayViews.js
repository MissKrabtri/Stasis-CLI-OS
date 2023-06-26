const got = require("got");

const sendViews = async (ebayUrl, useProxies, sendQty, autoBoost) => {
  global.logThis(
    `[eBay Views] ---> Sending ${sendQty} views to ${ebayUrl}`,
    "info"
  );
  for (let i = 1; i <= sendQty; i++) {
    global.logThis(`[eBay Views] --->  ${i} views sent to ${ebayUrl}`, "info");
    send(ebayUrl, useProxies);
    await global.sleep(100);
  }
  global.logThis(
    `[eBay Views] ---> ${sendQty} views sent to ${ebayUrl}`,
    "success"
  );

  if (autoBoost && autoBoost === true) {
    global.logThis(
      `[eBay Views] ---> Auto boosting ${ebayUrl} every 5 minutes...`,
      "warn"
    );
    await global.sleep(300000);
    sendViews(ebayUrl, useProxies, sendQty, autoBoost);
  }
};

const send = async (url, useProxies) => {
  try {
    let config = {
      method: "GET",
      url: url,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://www.ebay.com/",
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        TE: "trailers",
      },
    };
    await got(config);
  } catch (e) {
    //
  }
};

module.exports = {
  sendViews,
};
