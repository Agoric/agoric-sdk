/* eslint-env node */

/**
 * @file The purpose of this test is to make sure;
 * - Old priceFeed and scaledPriceAuthority vats that are replaced with new ones are truly quiescent.
 *   The method we use for this is to check if those vats received any deliveries from swingset that
 *   are of type "message" or "notify" (We give delivery types related to GC a pass since GC cycles
 *   aren't in our control).
 * - Make sure new price feeds can produce quotes
 * - Make sure vaults receive quotes
 */

import test from 'ava';
import '@endo/init';
import {
  agd,
  agoric,
  generateOracleMap,
  getPriceQuote,
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  pushPrices,
  registerOraclesForBrand,
} from '@agoric/synthetic-chain';
import { snapshotVat } from './test-lib/vat-helpers.js';
import {
  bankSend,
  ensureGCDeliveryOnly,
  getQuoteFromVault,
  pollRoundIdAndPushPrice,
  scale6,
} from './test-lib/priceFeed-lib.js';
import {
  retryUntilCondition,
  waitUntilOfferResult,
} from './test-lib/sync-tools.js';

const ambientAuthority = {
  query: agd.query,
  follow: agoric.follow,
  setTimeout,
};

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

/**
 * https://github.com/Agoric/agoric-sdk/pull/10074 introduced new price feeds to the system.
 * However, `f:replace-price-feeds` does not activate oracles for future layers of the build.
 * Meaning, proposals running after `f:replace-price-feeds` will not have  oracles that received
 * invitationMakers for new price feeds and there will not be quotes published by new
 * price feeds. There are conflicting work to fix this issue, see;
 *  - https://github.com/Agoric/agoric-sdk/pull/10296
 *  - https://github.com/Agoric/agoric-sdk/pull/10317
 *  - https://github.com/Agoric/agoric-sdk/pull/10296#pullrequestreview-2389390624
 *
 * The purpose of init() is to unblock testing new price feeds from the situation above. We can remove
 * this when it resolves.
 *
 * @param {Map<string,Array<{address: string; offerId: string}>>} oraclesByBrand
 */
const init = async oraclesByBrand => {
  const retryOptions = {
    log: console.log,
    maxRetries: 5,
    retryIntervalMs: 3000,
  };

  const atomInviteOffers = [];
  registerOraclesForBrand('ATOM', oraclesByBrand);
  // @ts-expect-error we expect oraclesByBrand.get('ATOM') will not return undefined
  for (const { address, offerId } of oraclesByBrand.get('ATOM')) {
    const offerP = waitUntilOfferResult(
      address,
      offerId,
      false,
      ambientAuthority,
      {
        errorMessage: `ERROR: ${address} could not accept invite, offerID: ${offerId}`,
        ...retryOptions,
      },
    );
    atomInviteOffers.push(offerP);
  }
  await Promise.all(atomInviteOffers);

  const stAtomInviteOffers = [];
  registerOraclesForBrand('stATOM', oraclesByBrand);
  // @ts-expect-error we expect oraclesByBrand.get('ATOM') will not return undefined
  for (const { address, offerId } of oraclesByBrand.get('stATOM')) {
    const offerP = waitUntilOfferResult(
      address,
      offerId,
      false,
      ambientAuthority,
      {
        errorMessage: `ERROR: ${address} could not accept invite, offerID: ${offerId}`,
        ...retryOptions,
      },
    );

    stAtomInviteOffers.push(offerP);
  }
  await Promise.all(stAtomInviteOffers);

  await pushPrices(1, 'ATOM', oraclesByBrand, 1);
  // await waitForBlock(3);
  await retryUntilCondition(
    () => getPriceQuote('ATOM'),
    res => res === '+1000000',
    'ATOM quote not received',
    { ...retryOptions, setTimeout },
  );
  await pushPrices(1, 'stATOM', oraclesByBrand, 1);
  await retryUntilCondition(
    () => getPriceQuote('stATOM'),
    res => res === '+1000000',
    'stATOM quote not received',
    { ...retryOptions, setTimeout },
  );
};

/**
 * @typedef {Map<string, Array<{ address: string; offerId: string }>>} OraclesByBrand
 */

test.before(async t => {
  // Fund each oracle members with 10IST incase we hit batch limit here https://github.com/Agoric/agoric-sdk/issues/6525
  await bankSend(GOV2ADDR, '10000000uist', GOV1ADDR);
  await bankSend(GOV3ADDR, '10000000uist', GOV1ADDR);

  const oraclesByBrand = generateOracleMap('z-acc', ['ATOM', 'stATOM']);
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
