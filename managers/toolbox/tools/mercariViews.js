const got = require("got");

const sendMercariViews = async (mercariUrl, useProxies, sendQty, autoBoost) => {
  global.logThis(
    `[Mercari Views] ---> Sending ${sendQty} views to ${mercariUrl}`,
    "info"
  );
  for (let i = 1; i <= sendQty; i++) {
    global.logThis(
      `[Mercari Views] --->  ${i} views sent to ${mercariUrl}`,
      "info"
    );
    send(mercariUrl, useProxies);
    await global.sleep(100);
  }
  global.logThis(
    `[Mercari Views] ---> ${sendQty} views sent to ${mercariUrl}`,
    "success"
  );

  if (autoBoost && autoBoost === true) {
    global.logThis(
      `[Mercari Views] ---> Auto boosting ${mercariUrl} every 5 minutes...`,
      "warn"
    );
    await global.sleep(300000);
    sendViews(mercariUrl, useProxies, sendQty, autoBoost);
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
  sendMercariViews,
};
