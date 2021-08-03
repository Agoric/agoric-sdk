// @ts-check
/* global __dirname */

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import bundleSource from '@agoric/bundle-source';

import {
  makeAndStoreInstanceRecord,
  makeInstanceRecordStorage,
} from '../../src/instanceRecordStorage.js';
import { makeIssuerRecord } from '../../src/issuerRecord.js';

const root = `${__dirname}/bounty`;

const setupIssuersForTest = () => {
  const currencyKit = makeIssuerKit(
    'currency',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  return { currencyKit, ticketKit };
};

test('makeAndStoreInstanceRecord', async t => {
  const { currencyKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = { getBundle: () => bundle };
  const fakeInstance = /** @type {Instance} */ ({});
  const customTerms = harden({ time: 2n });
  const issuers = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
  const {
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
  } = makeAndStoreInstanceRecord(
    fakeInstallation,
    fakeInstance,
    customTerms,
    issuers,
    brands,
  );

  t.deepEqual(getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(getIssuers(), issuers);
  t.deepEqual(getBrands(), brands);

  t.throws(() => assertUniqueKeyword('Currency'), {
    message: 'keyword "Currency" must be unique',
  });
  t.notThrows(() => assertUniqueKeyword('Something'));

  // Add currency again, but call it "money"
  addIssuerToInstanceRecord(
    'Money',
    makeIssuerRecord(currencyKit.brand, currencyKit.issuer, {
      assetKind: AssetKind.NAT,
      decimalPlaces: 18,
    }),
  );

  t.deepEqual(getIssuers(), { ...issuers, Money: currencyKit.issuer });
});

test('makeInstanceRecordStorage', async t => {
  const { currencyKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = { getBundle: () => bundle };
  const fakeInstance = /** @type {Instance} */ ({});
  const issuers = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
  const {
    addIssuerToInstanceRecord,
    getInstanceRecord,
    getTerms,
    getIssuers,
    getBrands,
    assertUniqueKeyword,
    instantiate,
  } = makeInstanceRecordStorage();
  instantiate({
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(getIssuers(), issuers);
  t.deepEqual(getBrands(), brands);

  t.throws(() => assertUniqueKeyword('Currency'), {
    message: 'keyword "Currency" must be unique',
  });
  t.notThrows(() => assertUniqueKeyword('Something'));

  // Add currency again, but call it "money"
  addIssuerToInstanceRecord(
    'Money',
    makeIssuerRecord(currencyKit.brand, currencyKit.issuer, {
      assetKind: AssetKind.NAT,
      decimalPlaces: 18,
    }),
  );

  t.deepEqual(getIssuers(), { ...issuers, Money: currencyKit.issuer });
});
