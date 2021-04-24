// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { makeIssuerKit, MathKind } from '@agoric/ertp';

import { makeIssuerStorage } from '../../src/issuerStorage';
import { makeIssuerRecord } from '../../src/issuerRecord';

const setupIssuersForTest = () => {
  const currencyKit = makeIssuerKit(
    'currency',
    MathKind.NAT,
    harden({ decimalPlaces: 18 }),
  );

  const ticketKit = makeIssuerKit('tickets', MathKind.SET);

  return { currencyKit, ticketKit };
};

test('storeIssuer, getMathKindByBrand', async t => {
  const { storeIssuer, getMathKindByBrand } = makeIssuerStorage();
  const { currencyKit, ticketKit } = setupIssuersForTest();

  const currencyIssuerRecord = await storeIssuer(currencyKit.issuer);
  t.is(currencyIssuerRecord.issuer, currencyKit.issuer);
  t.is(currencyIssuerRecord.brand, currencyKit.brand);
  t.is(currencyIssuerRecord.mathKind, MathKind.NAT);
  t.deepEqual(currencyIssuerRecord.displayInfo, {
    amountMathKind: MathKind.NAT,
    decimalPlaces: 18,
  });

  const ticketIssuerRecord = await storeIssuer(ticketKit.issuer);
  t.is(ticketIssuerRecord.issuer, ticketKit.issuer);
  t.is(ticketIssuerRecord.brand, ticketKit.brand);
  t.is(ticketIssuerRecord.mathKind, MathKind.SET);
  t.deepEqual(ticketIssuerRecord.displayInfo, {
    amountMathKind: MathKind.SET,
  });

  t.is(getMathKindByBrand(currencyKit.brand), MathKind.NAT);
  t.is(getMathKindByBrand(ticketKit.brand), MathKind.SET);
});

test('storeIssuer, same issuer twice', async t => {
  const { storeIssuer } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();

  const currencyIssuerRecord = await storeIssuer(currencyKit.issuer);
  const currencyIssuerRecord2 = await storeIssuer(currencyKit.issuer);

  t.deepEqual(currencyIssuerRecord, currencyIssuerRecord2);
});

test('storeIssuer, promise for issuer', async t => {
  const { storeIssuer } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();

  const currencyIssuerRecord = await storeIssuer(
    Promise.resolve(currencyKit.issuer),
  );

  t.is(currencyIssuerRecord.issuer, currencyKit.issuer);
  t.is(currencyIssuerRecord.brand, currencyKit.brand);
  t.is(currencyIssuerRecord.mathKind, MathKind.NAT);
  t.deepEqual(currencyIssuerRecord.displayInfo, {
    amountMathKind: MathKind.NAT,
    decimalPlaces: 18,
  });
});

test(`getMathKindByBrand - brand isn't stored`, t => {
  const { getMathKindByBrand } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();
  t.throws(() => getMathKindByBrand(currencyKit.brand), {
    message: '"brand" not found: "[Alleged: currency brand]"',
  });
});

test(`storeIssuerKeywordRecord, twice`, async t => {
  const { storeIssuerKeywordRecord } = makeIssuerStorage();
  const { currencyKit, ticketKit } = setupIssuersForTest();

  const issuerKeywordRecord = harden({
    Currency: currencyKit.issuer,
    Ticket: ticketKit.issuer,
  });

  const { issuers, brands } = await storeIssuerKeywordRecord(
    issuerKeywordRecord,
  );

  t.deepEqual(issuers, issuerKeywordRecord);
  t.deepEqual(brands, { Currency: currencyKit.brand, Ticket: ticketKit.brand });

  const { issuers: issuers2, brands: brands2 } = await storeIssuerKeywordRecord(
    issuerKeywordRecord,
  );

  t.deepEqual(issuers2, issuerKeywordRecord);
  t.deepEqual(brands2, {
    Currency: currencyKit.brand,
    Ticket: ticketKit.brand,
  });
});

test(`storeIssuerRecord`, async t => {
  const { storeIssuerRecord, getMathKindByBrand } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();

  const issuerRecord = makeIssuerRecord(
    currencyKit.brand,
    currencyKit.issuer,
    MathKind.NAT,
    {
      decimalPlaces: 18,
    },
  );

  const returnedIssuerRecord = await storeIssuerRecord(issuerRecord);

  t.deepEqual(returnedIssuerRecord, issuerRecord);

  t.is(getMathKindByBrand(currencyKit.brand), MathKind.NAT);
});

test('getBrandForIssuer', async t => {
  const { storeIssuer, getBrandForIssuer } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();

  await storeIssuer(currencyKit.issuer);

  t.is(currencyKit.brand, getBrandForIssuer(currencyKit.issuer));
});

test('getIssuerForBrand', async t => {
  const { storeIssuer, getIssuerForBrand } = makeIssuerStorage();
  const { currencyKit } = setupIssuersForTest();

  await storeIssuer(currencyKit.issuer);

  t.is(currencyKit.issuer, getIssuerForBrand(currencyKit.brand));
});

test('exportIssuerStorage', async t => {
  const { storeIssuer, exportIssuerStorage } = makeIssuerStorage();
  const { currencyKit, ticketKit } = setupIssuersForTest();

  const currencyIssuerRecord = await storeIssuer(currencyKit.issuer);
  await storeIssuer(ticketKit.issuer);

  // Note that only the currencyIssuer is going to be exported
  const exportedIssuerStorage = exportIssuerStorage([currencyKit.issuer]);

  t.deepEqual(exportedIssuerStorage, [currencyIssuerRecord]);
});

test('use exportedIssuerStorage', async t => {
  const { storeIssuer, exportIssuerStorage } = makeIssuerStorage();
  const { currencyKit, ticketKit } = setupIssuersForTest();

  const currencyIssuerRecord = await storeIssuer(currencyKit.issuer);
  await storeIssuer(ticketKit.issuer);

  // Note that only the currencyIssuer is going to be exported
  const exportedIssuerStorage = exportIssuerStorage([currencyKit.issuer]);

  t.deepEqual(exportedIssuerStorage, [currencyIssuerRecord]);

  // SecondIssuerStorage
  const { exportIssuerStorage: exportIssuerStorage2 } = makeIssuerStorage(
    exportedIssuerStorage,
  );

  const exportedIssuerStorage2 = exportIssuerStorage2([currencyKit.issuer]);
  t.deepEqual(exportedIssuerStorage2, [currencyIssuerRecord]);
});
