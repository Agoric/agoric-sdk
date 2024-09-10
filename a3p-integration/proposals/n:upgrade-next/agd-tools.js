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

export const registerOraclesForBrand = async (brandIn, oraclesByBrand) => {
  await null;
  const promiseArray = [];

  const oraclesWithID = oraclesByBrand.get(brandIn);
  for (const oracle of oraclesWithID) {
    const { address, offerId } = oracle;
    promiseArray.push(
      executeOffer(
        address,
        agops.oracle('accept', '--offerId', offerId, `--pair ${brandIn}.USD`),
      ),
    );
  }

  return Promise.all(promiseArray);
};

/**
 * Generate a consistent map of oracleIDs for a brand that can be used to
 * register oracles or to push prices. The baseID changes each time new
 * invitations are sent/accepted, and need to be maintained as constants in
 * scripts that use the oracles. Each oracleAddress and brand needs a unique
 * offerId, so we create recoverable IDs using the brandName and oracle id,
 * mixed with the upgrade at which the invitations were accepted.
 *
 * @param {string} baseId
 * @param {string} brandName
 */
const addOraclesForBrand = (baseId, brandName) => {
  const oraclesWithID = [];
  for (let i = 0; i < ORACLE_ADDRESSES.length; i += 1) {
    const oracleAddress = ORACLE_ADDRESSES[i];
    const offerId = `${brandName}.${baseId}.${i}`;
    oraclesWithID.push({ address: oracleAddress, offerId });
  }
  return oraclesWithID;
};

export const addPreexistingOracles = async (brandIn, oraclesByBrand) => {
  await null;

  const oraclesWithID = [];
  for (let i = 0; i < ORACLE_ADDRESSES.length; i += 1) {
    const oracleAddress = ORACLE_ADDRESSES[i];

    const path = `published.wallet.${oracleAddress}.current`;
    const wallet = await getQuoteBody(path);
    const idToInvitation = wallet.offerToUsedInvitation.find(([k]) => {
      return !isNaN(k[0]);
    });
    if (idToInvitation) {
      oraclesWithID.push({
        address: oracleAddress,
        offerId: idToInvitation[0],
      });
    } else {
      console.log('AGD addO skip', oraclesWithID);
    }
  }

  oraclesByBrand.set(brandIn, oraclesWithID);
};

/**
 * Generate a consistent map of oracleIDs and brands that can be used to
 * register oracles or to push prices. The baseID changes each time new
 * invitations are sent/accepted, and need to be maintained as constants in
 * scripts that use these records to push prices.
 *
 * @param {string} baseId
 * @param {string[]} brandNames
 */
export const generateOracleMap = (baseId, brandNames) => {
  const oraclesByBrand = new Map();
  for (const brandName of brandNames) {
    const oraclesWithID = addOraclesForBrand(baseId, brandName);
    oraclesByBrand.set(brandName, oraclesWithID);
  }
  return oraclesByBrand;
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

export const getVaultPrices = async index => {
  const path = `published.vaultFactory.managers.manager${index}.quotes`;
  const body = await getQuoteBody(path);
  return body.quoteAmount;
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
