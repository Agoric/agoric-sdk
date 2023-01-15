// @ts-nocheck

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import path from 'path';

import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import bundleSource from '@endo/bundle-source';
import { Far } from '@endo/far';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeInstanceRecordStorage } from '../../src/instanceRecordStorage.js';
import { makeIssuerRecord } from '../../src/issuerRecord.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

const root = `${dirname}/bounty.js`;

const setupIssuersForTest = () => {
  const currencyKit = makeIssuerKit(
    'currency',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  return { currencyKit, ticketKit };
};

test('makeInstanceRecordStorage', async t => {
  const { currencyKit, ticketKit } = setupIssuersForTest();
  const bundle = await bundleSource(root);
  const fakeInstallation = Far('fakeInstallation', { getBundle: () => bundle });
  const fakeInstance = /** @type {Instance} */ (
    Far('fakeInstance', { a: () => 0 })
  );
  const issuers = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });
  const brands = harden({
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
  const makeInstanceRecord = makeInstanceRecordStorage(
    makeScalarBigMapStore('instanceBaggage', {
      durable: true,
    }),
  );
  const instanceRecord = makeInstanceRecord(
    harden({
      installation: fakeInstallation,
      instance: fakeInstance,
      terms: { time: 2n, issuers, brands },
    }),
  );

  t.deepEqual(instanceRecord.getInstanceRecord(), {
    installation: fakeInstallation,
    instance: fakeInstance,
    terms: { time: 2n, issuers, brands },
  });

  t.deepEqual(instanceRecord.getTerms(), { time: 2n, issuers, brands });
  t.deepEqual(instanceRecord.getIssuers(), issuers);
  t.deepEqual(instanceRecord.getBrands(), brands);

  t.throws(() => instanceRecord.assertUniqueKeyword('Currency'), {
    message: 'keyword "Currency" must be unique',
  });
  t.notThrows(() => instanceRecord.assertUniqueKeyword('Something'));

  // Add currency again, but call it "money"
  instanceRecord.addIssuer(
    'Money',
    makeIssuerRecord(
      currencyKit.brand,
      currencyKit.issuer,
      harden({
        assetKind: AssetKind.NAT,
        decimalPlaces: 18,
      }),
    ),
  );

  t.deepEqual(instanceRecord.getIssuers(), {
    ...issuers,
    Money: currencyKit.issuer,
  });
});
