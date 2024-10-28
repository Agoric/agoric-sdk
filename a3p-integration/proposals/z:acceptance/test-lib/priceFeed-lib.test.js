import test from 'ava';
import '@endo/init';
import { ensureGCDeliveryOnly } from './priceFeed-lib.js';

const testConfig = {
  before: {
    '-scaledPriceAuthority-stATOM': { v58: 13, v74: 119 },
    '-scaledPriceAuthority-ATOM': { v46: 77, v73: 178 },
    '-stATOM-USD_price_feed': { v57: 40, v72: 192 },
    '-ATOM-USD_price_feed': { v29: 100, v70: 247 },
  },
  after: {
    '-scaledPriceAuthority-stATOM': { v58: 15, v74: 119 },
    '-scaledPriceAuthority-ATOM': { v46: 79, v73: 178 },
    '-stATOM-USD_price_feed': { v57: 42, v72: 192 },
    '-ATOM-USD_price_feed': { v29: 102, v70: 247 },
  },
};

const makeFakeGetTranscriptItemsForVat = (
  deliveryType,
  maximumAllowedDeliveries,
) => {
  const fakeGetTranscriptItemsForVat = (_, number) => {
    const fakeTranscriptItems = [];
    for (let i = 0; i < number; i += 1) {
      const item = { d: [deliveryType] };
      fakeTranscriptItems.push({ item: JSON.stringify(item) });
    }
    return fakeTranscriptItems;
  };

  const tooManyTranscriptItemsForVat = () => {
    const fakeTranscriptItems = [];
    for (let i = 0; i <= maximumAllowedDeliveries; i += 1) {
      const item = { d: [deliveryType] };
      fakeTranscriptItems.push({ item: JSON.stringify(item) });
    }
    return fakeTranscriptItems;
  };

  return { fakeGetTranscriptItemsForVat, tooManyTranscriptItemsForVat };
};

test('should not throw', t => {
  const { fakeGetTranscriptItemsForVat } =
    makeFakeGetTranscriptItemsForVat('dropExports');

  t.notThrows(() =>
    ensureGCDeliveryOnly(testConfig, {
      getTranscriptItems: fakeGetTranscriptItemsForVat,
    }),
  );
});

test('should throw for "notify"', t => {
  const { fakeGetTranscriptItemsForVat } =
    makeFakeGetTranscriptItemsForVat('notify');

  t.throws(
    () =>
      ensureGCDeliveryOnly(testConfig, {
        getTranscriptItems: fakeGetTranscriptItemsForVat,
      }),
    { message: 'DeliveryType "notify" is not GC delivery' },
  );
});

test('should throw for "message"', t => {
  const { fakeGetTranscriptItemsForVat } =
    makeFakeGetTranscriptItemsForVat('message');

  t.throws(
    () =>
      ensureGCDeliveryOnly(testConfig, {
        getTranscriptItems: fakeGetTranscriptItemsForVat,
      }),
    { message: 'DeliveryType "message" is not GC delivery' },
  );
});

test('should throw too many deliveries', t => {
  const { fakeGetTranscriptItemsForVat } = makeFakeGetTranscriptItemsForVat(
    'dropExports',
    5,
  );

  const config = {
    ...testConfig,
    after: {
      ...testConfig.after,
      '-scaledPriceAuthority-stATOM': { v58: 20, v74: 119 },
    },
  };

  t.throws(
    () =>
      ensureGCDeliveryOnly(config, {
        getTranscriptItems: fakeGetTranscriptItemsForVat,
      }),
    { message: '7 deliveries is greater than maximum allowed: 5' },
  );
});
