import test from 'ava';

import {
  agd,
  agops,
  agopsLocation,
  executeCommand,
  executeOffer,
  getVatDetails,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  newOfferId,
  USER1ADDR,
} from '@agoric/synthetic-chain';

const ORACLE_ADDRESSES = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

console.log(`pft A`);

const getOracleInstance = async price => {
  const instanceRec = await agd.query(
    'vstorage',
    'data',
    '--output',
    'json',
    `published.agoricNames.instance`,
  );

  // agd query -o json  vstorage data published.agoricNames.instance
  //    |& jq '.value | fromjson | .values[-1] | fromjson | .body[1:]
  //    | fromjson | .[-2] '

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

const checkForOracle = async (t, name) => {
  const instance = await getOracleInstance(name);
  t.truthy(instance);
};

test.serial.skip('check all priceFeed vats updated', async t => {
  const atomDetails = await getVatDetails('ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  const stAtomDetails = await getVatDetails('stATOM');
  t.is(stAtomDetails.incarnation, 0);
  const stOsmoDetails = await getVatDetails('stOSMO');
  t.is(stOsmoDetails.incarnation, 0);
  const stTiaDetails = await getVatDetails('stTIA');
  t.is(stTiaDetails.incarnation, 0);
  await checkForOracle(t, 'ATOM');
  await checkForOracle(t, 'stATOM');
  await checkForOracle(t, 'stTIA');
  await checkForOracle(t, 'stOSMO');
});

console.log(`pft G`);

const oraclesByBrand = new Map();

const addOraclesForBrand = async brandIn => {
  await null;
  const promiseArray = [];

  const oraclesWithID = [];
  for (const oracleAddress of ORACLE_ADDRESSES) {
    const offerId = await newOfferId();
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

const pushPrices = (price = 10.0, brandIn) => {
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

console.log(`pft M`);

const getPriceQuote = async price => {
  const priceQuote = await agd.query(
    'vstorage',
    'data',
    '--output',
    'json',
    `published.priceFeed.${price}-USD_price_feed`,
  );

  const body = JSON.parse(JSON.parse(priceQuote.value).values[0]);
  const bodyTruncated = JSON.parse(body.body.substring(1));
  return bodyTruncated.amountOut.value;
};

test.serial.skip('push prices', async t => {
  // There are no old prices for the other currencies.
  t.log('awaiting ATOM price pre');
  const atomOutPre = await getPriceQuote('ATOM');
  t.is(atomOutPre, '+12010000');

  t.log('adding oracle for each brand');
  await addOraclesForBrand('ATOM');
  await addOraclesForBrand('stATOM');
  await addOraclesForBrand('stTIA');
  await addOraclesForBrand('stOSMO');

  t.log('pushing new prices');
  await pushPrices(11.2, 'ATOM');
  await pushPrices(11.3, 'stTIA');
  await pushPrices(11.4, 'stATOM');
  await pushPrices(11.5, 'stOSMO');

  t.log('awaiting new quotes');
  // agd query -o json  vstorage data published.priceFeed.stOSMO-USD_price_feed |&
  //   jq '.value | fromjson | .values[0] | fromjson | .body[1:] | fromjson | .amountOut.value'
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+11200000');
  const tiaOut = await getPriceQuote('stTIA');
  t.is(tiaOut, '+11300000');
  const stAtomOut = await getPriceQuote('stATOM');
  t.is(stAtomOut, '+11400000');
  const osmoOut = await getPriceQuote('stOSMO');
  t.is(osmoOut, '+11500000');
});

export const agopsInter = (...params) => {
  const newParams = ['inter', ...params];
  return executeCommand(agopsLocation, newParams);
};

console.log(`pft Q`);

// agops inter bid by-price --price 1 --give 1.0IST --from $GOV1ADDR --keyring-backend test
test.serial('create new bid', async t => {
  await executeOffer(
    USER1ADDR,
    agopsInter(
      'bid',
      'by-price',
      '--price 20',
      `--give 1.0IST`,
      '--from',
      USER1ADDR,
      '--keyring-backend test',
      `--offer-id bid-vaultUpgrade-test`,
    ),
  );

  t.pass();
});

test.serial('open a marginal vault', async t => {
  t.log('marginal');
  await t.pass();
});

const getAuctionData = async book => {
  const auctionStatsRaw = await agd.query(
    'vstorage',
    'data',
    '--output',
    'json',
    `published.auction.${book}`,
  );

  const body = JSON.parse(JSON.parse(auctionStatsRaw.value).values[0]);
  const bodyTruncated = JSON.parse(body.body.substring(1));
  return bodyTruncated;
};

test.serial('trigger auction', async t => {
  console.log(`start TRIGGER`);
  t.log('trigger');
  await null;
  console.log('before', await getAuctionData('book1'));
  await pushPrices(5.2, 'ATOM');

  // agd query -o json  vstorage data published.priceFeed.stOSMO-USD_price_feed |&
  //   jq '.value | fromjson | .values[0] | fromjson | .body[1:] | fromjson | .amountOut.value'
  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+5200000');

  // TODO  check USER1 purse for proceeds
  // TODO check auction records for trade
  console.log('after', await getAuctionData('book1'));
});
