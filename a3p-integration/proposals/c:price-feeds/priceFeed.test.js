import test from 'ava';

import {
  agd,
  agops,
  evalBundles,
  executeOffer,
  getVatDetails,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  newOfferId,
  waitForBlock,
} from '@agoric/synthetic-chain';

const SUBMISSION_DIR = 'priceFeed-submission';

const ORACLE_ADDRESSES = [GOV1ADDR, GOV2ADDR, GOV3ADDR];

test('update all priceFeed vats', async t => {
  await null;
  await evalBundles(SUBMISSION_DIR);

  await waitForBlock(2); // enough time for 4 vats to start

  const atomDetails = await getVatDetails('ATOM-USD_price_feed');
  // both the original and the new ATOM vault are incarnation 0
  t.is(atomDetails.incarnation, 0);
  const stAtomDetails = await getVatDetails('stATOM');
  t.is(stAtomDetails.incarnation, 0);
  const stOsmoDetails = await getVatDetails('stOSMO');
  t.is(stOsmoDetails.incarnation, 0);
  const stTiaDetails = await getVatDetails('stTIA');
  t.is(stTiaDetails.incarnation, 0);
});

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
  console.log(`ACTIONS pushPrice ${price} for ${brandIn}`);
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

async function getPriceQuote(price) {
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
}

test('push prices', async t => {
  // There are no old prices for the other currencies.
  const atomOutPre = await getPriceQuote('ATOM');
  t.is(atomOutPre, '+12010000');

  await addOraclesForBrand('ATOM');
  await addOraclesForBrand('stATOM');
  await addOraclesForBrand('stTIA');
  await addOraclesForBrand('stOSMO');

  await pushPrices(11.2, 'ATOM');
  await pushPrices(11.3, 'stTIA');
  await pushPrices(11.4, 'stATOM');
  await pushPrices(11.5, 'stOSMO');

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
