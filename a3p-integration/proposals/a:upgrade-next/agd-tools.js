import {
  agd,
  agops,
  agopsLocation,
  CHAINID,
  executeCommand,
  executeOffer,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  newOfferId,
  VALIDATORADDR,
} from '@agoric/synthetic-chain';

const ORACLE_ADDRESSES = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

export const BID_OFFER_ID = 'bid-vaultUpgrade-test3';

const queryVstorage = path =>
  agd.query('vstorage', 'data', '--output', 'json', path);

// XXX use endo/marshal?
const getQuoteBody = async path => {
  const queryOut = await queryVstorage(path);

  const body = JSON.parse(JSON.parse(queryOut.value).values[0]);
  return JSON.parse(body.body.substring(1));
};

export const getOracleInstance = async price => {
  const instanceRec = await queryVstorage(`published.agoricNames.instance`);

  const value = JSON.parse(instanceRec.value);
  const body = JSON.parse(value.values.at(-1));

  const feeds = JSON.parse(body.body.substring(1));
  const feedName = `${price}-USD price feed`;

  const key = Object.keys(feeds).find(k => feeds[k][0] === feedName);
  if (key) {
    return body.slots[key];
  }
  return null;
};

export const checkForOracle = async (t, name) => {
  const instance = await getOracleInstance(name);
  t.truthy(instance);
};

export const addOraclesForBrand = async (brandIn, oraclesByBrand) => {
  await null;
  const promiseArray = [];

  const oraclesWithID = [];
  // newOfferId() waits 1 second
  const offerIdBase = await newOfferId();
  for (let i = 0; i < ORACLE_ADDRESSES.length; i += 1) {
    const oracleAddress = ORACLE_ADDRESSES[i];
    const offerId = `${offerIdBase}.${i}`;
    oraclesWithID.push({ address: oracleAddress, offerId });

    promiseArray.push(
      executeOffer(
        oracleAddress,
        agops.oracle('accept', '--offerId', offerId, `--pair ${brandIn}.USD`),
      ),
    );
  }
  oraclesByBrand.set(brandIn, oraclesWithID);

  return Promise.all(promiseArray);
};

export const pushPrices = (price, brandIn, oraclesByBrand) => {
  const promiseArray = [];

  for (const oracle of oraclesByBrand.get(brandIn)) {
    promiseArray.push(
      executeOffer(
        oracle.address,
        agops.oracle(
          'pushPriceRound',
          '--price',
          price,
          '--oracleAdminAcceptOfferId',
          oracle.offerId,
        ),
      ),
    );
  }

  return Promise.all(promiseArray);
};

export const getPriceQuote = async price => {
  const path = `published.priceFeed.${price}-USD_price_feed`;
  const body = await getQuoteBody(path);
  return body.amountOut.value;
};

export const agopsInter = (...params) => {
  const newParams = ['inter', ...params];
  return executeCommand(agopsLocation, newParams);
};

export const createBid = (price, addr, offerId) => {
  return agopsInter(
    'bid',
    'by-price',
    `--price ${price}`,
    `--give 1.0IST`,
    '--from',
    addr,
    '--keyring-backend test',
    `--offer-id ${offerId}`,
  );
};

export const getLiveOffers = async addr => {
  const path = `published.wallet.${addr}.current`;
  const body = await getQuoteBody(path);
  return body.liveOffers;
};

export const getAuctionCollateral = async index => {
  const path = `published.auction.book${index}`;
  const body = await getQuoteBody(path);
  return body.collateralAvailable.value;
};

export const bankSend = (addr, wanted) => {
  const chain = ['--chain-id', CHAINID];
  const from = ['--from', VALIDATORADDR];
  const testKeyring = ['--keyring-backend', 'test'];
  const noise = [...from, ...chain, ...testKeyring, '--yes'];

  return agd.tx('bank', 'send', VALIDATORADDR, addr, wanted, ...noise);
};

export const getProvisionPoolMetrics = async () => {
  const path = `published.provisionPool.metrics`;
  return getQuoteBody(path);
};
