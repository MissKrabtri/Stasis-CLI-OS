const got = require("got");
const cheerio = require("cheerio");

const getItemInfo = async (body) => {
  let itemIdMatch = body.match(/content="ouapp:\/\/\/item\/detail\/(\d+)"/);
  let itemId = itemIdMatch ? itemIdMatch[1] : null;

  let listingIdMatch = body.match(/"listingId":"(.*?)"/);
  let listingId = listingIdMatch ? listingIdMatch[1] : null;

  let sellerIdMatch = body.match(/,"ownerId":"(\d+)"/);
  let sellerId = sellerIdMatch ? sellerIdMatch[1] : null;
  return {
    itemId,
    listingId,
    sellerId,
  };
};

const sendOfferUpViews = async (url, sendQty, useProxies, autoBoost) => {
  let config = {
    method: "GET",
    url,
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
  let response = await got(config);
  let $ = cheerio.load(response.body);
  let { itemId, listingId, sellerId } = await getItemInfo(response.body);
  global.logThis(
    `[OfferUp Views] ---> Sending ${sendQty} views to [ ${url} ]`,
    "info"
  );
  for (let i = 1; i <= sendQty; i++) {
    global.logThis(
      `[OfferUp Views] ---> ${i} views sent to [ ${url} ]`,
      "info"
    );
    (async () => {
      await sendView(itemId, listingId, sellerId, url);
    })();
  }
  global.logThis(
    `[OfferUp Views] ---> ${sendQty} views sent to [ ${url} ]`,
    "success"
  );

  if (autoBoost === true) {
    global.logThis(
      `[OfferUp Views] ---> Auto boosting ${url} every 5 minutes...`,
      "warn"
    );
    await global.sleep(300 * 1000);
    sendOfferUpViews(url, sendQty, useProxies, autoBoost);
  }
};

const sendView = async (itemId, listingId, sellerId, url) => {
  try {
    let config = {
      method: "POST",
      url: "https://offerup.com/api/graphql",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "content-type": "application/json",
        "ou-browser-user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/114.0",
        Origin: "https://offerup.com",
        Referer: url,
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
      },
      json: {
        operationName: "TrackItemViewed",
        variables: {
          itemId: itemId,
          listingId: listingId,
          sellerId: sellerId,
          header: {
            appVersion: "",
            deviceId: "None",
            origin: "web_desktop",
            timestamp: "None",
            uniqueId: "None",
          },
          mobileHeader: { localTimestamp: "None" },
          shipping: { available: false },
          posting: {
            itemTitle: "None",
            itemPrice: 10900,
            itemCondition: 40,
            itemLocation: {
              latitude: 41.6750889,
              longitude: -72.92243289999999,
            },
            postingTimestamp: "None",
          },
          vehicle: {
            make: null,
            mileage: null,
            model: null,
            year: null,
          },
          tileLocation: null,
          categoryId: "14",
          sellerType: "PRIVATE_PARTY",
          moduleRank: null,
        },
        query:
          "mutation TrackItemViewed($itemId: ID!, $listingId: ID!, $sellerId: ID!, $header: ItemViewedEventHeader!, $mobileHeader: ItemViewedEventMobileHeader!, $origin: String, $source: String, $tileType: String, $userId: String, $moduleId: ID, $shipping: ShippingInput, $vehicle: VehicleInput, $posting: PostingInput, $tileLocation: Int, $categoryId: String, $moduleType: String, $sellerType: SellerType, $moduleRank: Int) {\n  itemViewed(\n    data: {itemId: $itemId, listingId: $listingId, sellerId: $sellerId, origin: $origin, source: $source, tileType: $tileType, userId: $userId, header: $header, mobileHeader: $mobileHeader, moduleId: $moduleId, shipping: $shipping, vehicle: $vehicle, posting: $posting, tileLocation: $tileLocation, categoryId: $categoryId, moduleType: $moduleType, sellerType: $sellerType, moduleRank: $moduleRank}\n  )\n}\n",
      },
      responseType: "json",
    };

    let res = await got(config);
  } catch (e) {
    //
  }
};

module.exports = {
  sendOfferUpViews,
};
