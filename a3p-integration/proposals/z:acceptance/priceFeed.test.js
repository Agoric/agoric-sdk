import test from 'ava';
import '@endo/init';
import {
  generateOracleMap,
  getPriceQuote,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  pushPrices,
  registerOraclesForBrand,
  waitForBlock,
} from '@agoric/synthetic-chain';
import { snapshotVat } from './test-lib/vat-helpers.js';
import {
  bankSend,
  ensureGCDeliveryOnly,
  getQuoteFromVault,
  pollRoundIdAndPushPrice,
  scale6,
} from './test-lib/priceFeed-lib.js';

const config = {
  vatNames: [
    '-scaledPriceAuthority-stATOM',
    '-scaledPriceAuthority-ATOM',
    '-stATOM-USD_price_feed',
    '-ATOM-USD_price_feed',
  ],
  snapshots: { before: {}, after: {} }, // Will be filled in the runtime
  priceFeeds: {
    ATOM: {
      price: 29,
      managerIndex: 0,
      name: 'ATOM',
    },
    stATOM: {
      price: 25,
      managerIndex: 1,
      name: 'stATOM',
    },
  },
};

// Remove this one when #10296 goes in
const init = async oraclesByBrand => {
  await registerOraclesForBrand('ATOM', oraclesByBrand);
  await waitForBlock(3);
  await registerOraclesForBrand('stATOM', oraclesByBrand);
  await waitForBlock(3);

  await pushPrices(1, 'ATOM', oraclesByBrand, 1);
  await waitForBlock(3);
  await pushPrices(1, 'stATOM', oraclesByBrand, 1);
};

/**
 * @typedef {Map<string, Array<{ address: string; offerId: string }>>} OraclesByBrand
 */

test.before(async t => {
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

test.serial('snapshot state', t => {
  config.vatNames.forEach(name => {
    config.snapshots.before[name] = snapshotVat(name);
  });
  console.dir(config.snapshots, { depth: null });
  t.pass();
});

test.serial('push-price', async t => {
  // @ts-expect-error casting
  const { oraclesByBrand } = t.context;
  const {
    priceFeeds: { ATOM, stATOM },
  } = config;

  await pollRoundIdAndPushPrice(ATOM.name, ATOM.price, oraclesByBrand);
  await pollRoundIdAndPushPrice(stATOM.name, stATOM.price, oraclesByBrand);

  const atomOut = await getPriceQuote(ATOM.name);
  t.is(atomOut, `+${scale6(ATOM.price)}`);
  const stAtomOut = await getPriceQuote(stATOM.name);
  t.is(stAtomOut, `+${scale6(stATOM.price)}`);
  t.pass();
});

test.serial('snapshot state after price pushed', t => {
  config.vatNames.forEach(name => {
    config.snapshots.after[name] = snapshotVat(name);
  });
  console.dir(config.snapshots, { depth: null });
  t.pass();
});

test.serial('ensure only gc', t => {
  ensureGCDeliveryOnly(config.snapshots);
  t.pass();
});

test.serial('make sure vaults got the prices', async t => {
  const {
    priceFeeds: { ATOM, stATOM },
  } = config;
  const [atomVaultQuote, stAtomVaultQuote] = await Promise.all([
    getQuoteFromVault(ATOM.managerIndex),
    getQuoteFromVault(stATOM.managerIndex),
  ]);

  t.is(atomVaultQuote, scale6(ATOM.price).toString());
  t.is(stAtomVaultQuote, scale6(stATOM.price).toString());
});
