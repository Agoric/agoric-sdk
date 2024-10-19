import test from 'ava';
import {
  getTranscriptItemsForVat,
  getVatsWithSameName,
  swingStore,
} from './test-lib/vat-helpers.js';
import {
  addPreexistingOracles,
  generateOracleMap,
  getPriceQuote,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  pushPrices,
  registerOraclesForBrand,
  waitForBlock,
} from '@agoric/synthetic-chain';
import { bankSend, pollRoundIdAndPushPrice } from './test-lib/priceFeed-lib.js';

const init = async oraclesByBrand => {
  await registerOraclesForBrand('ATOM', oraclesByBrand);
  await waitForBlock(3);
  await registerOraclesForBrand('stATOM', oraclesByBrand);
  await waitForBlock(3);

  await pushPrices(1, 'ATOM', oraclesByBrand, 1);
  await waitForBlock(3);
  await pushPrices(1, 'stATOM', oraclesByBrand, 1);
}

/**
 * @typedef {Map<string, Array<{ address: string; offerId: string }>>} OraclesByBrand
 */

test.before.skip(async t => {
  // Fund each oracle members with 10IST incase we hit batch limit here https://github.com/Agoric/agoric-sdk/issues/6525
  await bankSend(GOV2ADDR, '10000000uist', GOV1ADDR);
  await bankSend(GOV3ADDR, '10000000uist', GOV1ADDR);

  const oraclesByBrand = generateOracleMap('f-priceFeeds', ['ATOM', 'stATOM']);
  t.log(oraclesByBrand);

  await init(oraclesByBrand);
  t.context = {
    oraclesByBrand,
  };
});

test.skip('push-price', async t => {
  // @ts-expect-error casting
  const { oraclesByBrand } = t.context;

  await pollRoundIdAndPushPrice('ATOM', 25, oraclesByBrand);
  await pollRoundIdAndPushPrice('stATOM', 21, oraclesByBrand);

  const atomOut = await getPriceQuote('ATOM');
  t.is(atomOut, '+25000000');
  const stAtomOut = await getPriceQuote('stATOM');
  t.is(stAtomOut, '+21000000');
  t.pass();
});

test.serial('dum', async t => {
  // const stATOM = await getVatsWithSameName('-stATOM-USD_price_feed');
  // const scaledStATOM = await getVatsWithSameName(
  //   '-scaledPriceAuthority-stATOM',
  // );
  // t.log(scaledStATOM);
  const { findVatsAll, lookupVat, findVatsExact } = swingStore;

  // const items = findVatsAll('scaledPriceAuthority');
  // items.forEach(id => console.log(lookupVat(id).options(), id));

  const stATOMScaledPAs = findVatsExact('-scaledPriceAuthority-stATOM');
  stATOMScaledPAs.forEach(id => console.log(getTranscriptItemsForVat(id, 1).map((element) =>( JSON.parse(element.item).d[0]))));

  t.pass();
});
