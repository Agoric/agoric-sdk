import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeIssuerKit, AssetKind } from '@agoric/ertp';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { provideIssuerStorage as provideIssuerStorageOrig } from '../../src/issuerStorage.js';
import { makeIssuerRecord } from '../../src/issuerRecord.js';

const provideIssuerStorage = () => {
  return provideIssuerStorageOrig(
    makeScalarBigMapStore('zcfBaggage', { durable: true }),
  );
};

const setupIssuersForTest = () => {
  const stableKit = makeIssuerKit(
    'stable',
    AssetKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', AssetKind.SET);

  return { stableKit, ticketKit };
};

test('storeIssuer, getAssetKindByBrand', async t => {
  const { storeIssuer, getAssetKindByBrand, instantiate } =
    provideIssuerStorage();
  instantiate();
  const { stableKit, ticketKit } = setupIssuersForTest();

  const stableIssuerRecord = await storeIssuer(stableKit.issuer);
  t.is(stableIssuerRecord.issuer, stableKit.issuer);
  t.is(stableIssuerRecord.brand, stableKit.brand);
  t.is(stableIssuerRecord.assetKind, AssetKind.NAT);
  t.deepEqual(stableIssuerRecord.displayInfo, {
    assetKind: AssetKind.NAT,
    decimalPlaces: 18,
  });

  const ticketIssuerRecord = await storeIssuer(ticketKit.issuer);
  t.is(ticketIssuerRecord.issuer, ticketKit.issuer);
  t.is(ticketIssuerRecord.brand, ticketKit.brand);
  t.is(ticketIssuerRecord.assetKind, AssetKind.SET);
  t.deepEqual(ticketIssuerRecord.displayInfo, {
    assetKind: AssetKind.SET,
  });

  t.is(getAssetKindByBrand(stableKit.brand), AssetKind.NAT);
  t.is(getAssetKindByBrand(ticketKit.brand), AssetKind.SET);
});

test('storeIssuer, same issuer twice', async t => {
  const { storeIssuer, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  const stableIssuerRecord = await storeIssuer(stableKit.issuer);
  const stableIssuerRecord2 = await storeIssuer(stableKit.issuer);

  t.deepEqual(stableIssuerRecord, stableIssuerRecord2);
});

test('storeIssuer, promise for issuer', async t => {
  const { storeIssuer, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  const stableIssuerRecord = await storeIssuer(
    Promise.resolve(stableKit.issuer),
  );

  t.is(stableIssuerRecord.issuer, stableKit.issuer);
  t.is(stableIssuerRecord.brand, stableKit.brand);
  t.is(stableIssuerRecord.assetKind, AssetKind.NAT);
  t.deepEqual(stableIssuerRecord.displayInfo, {
    assetKind: AssetKind.NAT,
    decimalPlaces: 18,
  });
});

test(`getAssetKindByBrand - brand isn't stored`, t => {
  const { getAssetKindByBrand, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();
  t.throws(() => getAssetKindByBrand(stableKit.brand), {
    message:
      'key "[Alleged: stable brand]" not found in collection "brandToIssuerRecord"',
  });
});

test(`storeIssuerKeywordRecord, twice`, async t => {
  const { storeIssuerKeywordRecord, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit, ticketKit } = setupIssuersForTest();

  const issuerKeywordRecord = harden({
    Stable: stableKit.issuer,
    Ticket: ticketKit.issuer,
  });

  const { issuers, brands } =
    await storeIssuerKeywordRecord(issuerKeywordRecord);

  t.deepEqual(issuers, issuerKeywordRecord);
  t.deepEqual(brands, { Stable: stableKit.brand, Ticket: ticketKit.brand });

  const { issuers: issuers2, brands: brands2 } =
    await storeIssuerKeywordRecord(issuerKeywordRecord);

  t.deepEqual(issuers2, issuerKeywordRecord);
  t.deepEqual(brands2, {
    Stable: stableKit.brand,
    Ticket: ticketKit.brand,
  });
});

test(`storeIssuerRecord`, async t => {
  const { storeIssuerRecord, getAssetKindByBrand, instantiate } =
    provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  const issuerRecord = makeIssuerRecord(
    stableKit.brand,
    stableKit.issuer,
    harden({
      decimalPlaces: 18,
      assetKind: AssetKind.NAT,
    }),
  );

  const returnedIssuerRecord = await storeIssuerRecord(issuerRecord);

  t.deepEqual(returnedIssuerRecord, issuerRecord);

  t.is(getAssetKindByBrand(stableKit.brand), AssetKind.NAT);
});

test(`storeIssuerRecord twice`, async t => {
  const { storeIssuerRecord, getAssetKindByBrand, instantiate } =
    provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  const issuerRecord = makeIssuerRecord(
    stableKit.brand,
    stableKit.issuer,
    harden({
      decimalPlaces: 18,
      assetKind: AssetKind.NAT,
    }),
  );

  const returnedIssuerRecord = await storeIssuerRecord(issuerRecord);

  t.deepEqual(returnedIssuerRecord, issuerRecord);

  t.is(getAssetKindByBrand(stableKit.brand), AssetKind.NAT);

  const returnedIssuerRecord2 = await storeIssuerRecord(issuerRecord);

  t.deepEqual(returnedIssuerRecord2, issuerRecord);
});

test('getBrandForIssuer', async t => {
  const { storeIssuer, getBrandForIssuer, instantiate } =
    provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  await storeIssuer(stableKit.issuer);

  t.is(stableKit.brand, getBrandForIssuer(stableKit.issuer));
});

test('getIssuerForBrand', async t => {
  const { storeIssuer, getIssuerForBrand, instantiate } =
    provideIssuerStorage();
  instantiate();
  const { stableKit } = setupIssuersForTest();

  await storeIssuer(stableKit.issuer);

  t.is(stableKit.issuer, getIssuerForBrand(stableKit.brand));
});

test('getIssuerRecords', async t => {
  const { storeIssuer, getIssuerRecords, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit, ticketKit } = setupIssuersForTest();

  const stableIssuerRecord = await storeIssuer(stableKit.issuer);
  await storeIssuer(ticketKit.issuer);

  // Note that only the stableIssuer is going to be exported
  const issuerRecords = getIssuerRecords([stableKit.issuer]);

  t.deepEqual(issuerRecords, [stableIssuerRecord]);
});

test('use issuerRecords', async t => {
  const { storeIssuer, getIssuerRecords, instantiate } = provideIssuerStorage();
  instantiate();
  const { stableKit, ticketKit } = setupIssuersForTest();

  const stableIssuerRecord = await storeIssuer(stableKit.issuer);
  await storeIssuer(ticketKit.issuer);

  // Note that only the stableIssuer is going to be exported
  const issuerRecords = getIssuerRecords([stableKit.issuer]);

  t.deepEqual(issuerRecords, [stableIssuerRecord]);

  // SecondIssuerStorage
  const { getIssuerRecords: getIssuerRecords2, instantiate: instantiate2 } =
    provideIssuerStorage();
  instantiate2(issuerRecords);

  const exportedIssuerStorage2 = getIssuerRecords2([stableKit.issuer]);
  t.deepEqual(exportedIssuerStorage2, [stableIssuerRecord]);
});
