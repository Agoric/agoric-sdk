import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { addressTools } from '../../src/utils/address.js';

const FIXTURES = {
  AGORIC_WITH_DYDX:
    'agoric1bech32addr?EUD=dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
  AGORIC_WITH_OSMO:
    'agoric1bech32addr?EUD=osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
  AGORIC_WITH_MULTIPLE:
    'agoric1bech32addr?EUD=osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men&CID=dydx-mainnet-1',
  AGORIC_NO_PARAMS: 'agoric1bech32addr',
  INVALID_MULTIPLE_QUESTION: 'agoric1bech32addr?param1=value1?param2=value2',
  INVALID_PARAM_FORMAT: 'agoric1bech32addr?invalidparam',
} as const;

// hasQueryParams tests
test('hasQueryParams: returns true when address has parameters', t => {
  t.true(addressTools.hasQueryParams(FIXTURES.AGORIC_WITH_DYDX));
  t.true(addressTools.hasQueryParams(FIXTURES.AGORIC_WITH_OSMO));
  t.true(addressTools.hasQueryParams(FIXTURES.AGORIC_WITH_MULTIPLE));
});

test('hasQueryParams: returns false when address has no parameters', t => {
  t.false(addressTools.hasQueryParams(FIXTURES.AGORIC_NO_PARAMS));
});

test('hasQueryParams: returns true for invalid parameter formats (only checks for ?)', t => {
  t.true(addressTools.hasQueryParams(FIXTURES.INVALID_MULTIPLE_QUESTION));
  t.true(addressTools.hasQueryParams(FIXTURES.INVALID_PARAM_FORMAT));
});

// getQueryParams tests - positive cases
test('getQueryParams: correctly parses address with single EUD parameter', t => {
  const result = addressTools.getQueryParams(FIXTURES.AGORIC_WITH_DYDX);
  t.deepEqual(result, {
    address: 'agoric1bech32addr',
    params: {
      EUD: 'dydx183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
    },
  });
});

test('getQueryParams: correctly parses address with multiple parameters', t => {
  const result = addressTools.getQueryParams(FIXTURES.AGORIC_WITH_MULTIPLE);
  t.deepEqual(result, {
    address: 'agoric1bech32addr',
    params: {
      EUD: 'osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men',
      CID: 'dydx-mainnet-1',
    },
  });
});

test('getQueryParams: correctly handles address with no parameters', t => {
  const result = addressTools.getQueryParams(FIXTURES.AGORIC_NO_PARAMS);
  t.deepEqual(result, {
    address: 'agoric1bech32addr',
    params: {},
  });
});

// getQueryParams tests - negative cases
test('getQueryParams: throws error for multiple question marks', t => {
  t.throws(
    () => addressTools.getQueryParams(FIXTURES.INVALID_MULTIPLE_QUESTION),
    {
      message:
        'Invalid input. Must be of the form \'address?params\': "agoric1bech32addr?param1=value1?param2=value2"',
    },
  );
});

test('getQueryParams: throws error for invalid parameter format', t => {
  t.throws(() => addressTools.getQueryParams(FIXTURES.INVALID_PARAM_FORMAT), {
    message: 'Invalid parameter format in pair: "invalidparam"',
  });
});
