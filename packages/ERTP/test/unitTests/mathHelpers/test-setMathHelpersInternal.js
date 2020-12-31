// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import {
  hashBadly,
  makeBuckets,
  removeDuplicates,
  makeGetStr,
  makeGetBucketKeyBasedOnSearchRecord,
} from '../../../src/mathHelpers/setMathHelpers';
import { makeIssuerKit } from '../../../src';

test('hashBadly basics', t => {
  t.is(hashBadly({}), '');
  t.is(hashBadly({ name: 'a' }), 'name,a');
  t.is(hashBadly({ instance: {} }), 'instance');
});

// Note that hashBadly is not narrowing the comparisons very well for
// invitations, apart from the description value, because most values
// are not strings
test('hashBadly invitationDetails', t => {
  const mockTimeAuthority = {
    tick: () => {},
  };
  const mockInstallation = {
    getBundle: () => {},
  };
  const { amountMath: moolaAmountMath } = makeIssuerKit('moola');
  const { amountMath: simoleanAmountMath } = makeIssuerKit('simolean');
  const underlyingAssets = {
    UnderlyingAssets: moolaAmountMath.make(3),
  };
  const strikePrice = {
    StrikePrice: simoleanAmountMath.make(7),
  };
  const invitationDetails = {
    expirationDate: 100,
    timeAuthority: mockTimeAuthority,
    underlyingAssets,
    strikePrice,
    description: 'exerciseOption',
    handle: {},
    instance: {},
    installation: mockInstallation,
  };
  t.is(
    hashBadly(invitationDetails),
    'description,expirationDate,handle,installation,instance,strikePrice,timeAuthority,underlyingAssets,exerciseOption',
  );

  const invitationDetailsPartial = {
    expirationDate: 100,
    strikePrice,
    timeAuthority: mockTimeAuthority,
    installation: mockInstallation,
    description: 'exerciseOption',
  };
  t.is(
    hashBadly(invitationDetailsPartial),
    'description,expirationDate,installation,strikePrice,timeAuthority,exerciseOption',
  );
});

test('hashBadly tickets', t => {
  const record = { number: 1, show: 'Les Mis' };
  t.is(hashBadly(record), 'number,show,Les Mis');
});

test('removeDuplicates empty array', t => {
  const buckets = makeBuckets(harden([]));
  t.deepEqual(removeDuplicates(buckets), []);
});

test('removeDuplicates one element array', t => {
  const buckets = makeBuckets(harden([{ a: 'b' }]));
  t.deepEqual(removeDuplicates(buckets), [{ a: 'b' }]);
});

test('removeDuplicates duplicate', t => {
  const buckets = makeBuckets(harden([{ a: 'b' }, { a: 'b' }]));
  t.deepEqual(removeDuplicates(buckets), [{ a: 'b' }]);
});

test('removeDuplicates not duplicate', t => {
  const buckets = makeBuckets(harden([{ a: 'b' }, { a: 'not b' }]));
  t.deepEqual(removeDuplicates(buckets), [{ a: 'b' }, { a: 'not b' }]);
});

test('removeDuplicates not duplicate with non-string values', t => {
  const value1 = {};
  const value2 = {};
  const buckets = makeBuckets(harden([{ a: value1 }, { a: value2 }]));
  t.deepEqual(removeDuplicates(buckets), [{ a: value1 }, { a: value2 }]);
});

test('getStr', t => {
  const getStr = makeGetStr();
  t.is(getStr('a'), 'a');
  // Anything not a string and not a presence gets a default string value
  t.is(getStr(harden(Promise.resolve())), '0');
  const presence = { doSomething: () => {} };
  const presence2 = { ...presence };
  t.is(getStr(harden(presence)), '1');
  // repeated actions get same answer
  t.is(getStr(harden(presence)), '1');
  // presences not yet seen get a new string
  t.is(getStr(harden(presence2)), '2');
  t.is(getStr(harden(presence2)), '2');

  // Anything not a string and not a presence gets a default string value
  t.is(getStr(harden({ name: 'a ' })), '0');
});

test('getBucketKeyBasedOnSearchRecord', t => {
  const mockTimeAuthority = {
    tick: () => {},
  };
  const mockInstallation = {
    getBundle: () => {},
  };
  const { amountMath: moolaAmountMath } = makeIssuerKit('moola');
  const { amountMath: simoleanAmountMath } = makeIssuerKit('simolean');
  const underlyingAssets = {
    UnderlyingAssets: moolaAmountMath.make(3),
  };
  const strikePrice = {
    StrikePrice: simoleanAmountMath.make(7),
  };
  const invitationDetails = harden({
    expirationDate: 100,
    timeAuthority: mockTimeAuthority,
    underlyingAssets,
    strikePrice,
    description: 'exerciseOption',
    handle: {},
    instance: {},
    installation: mockInstallation,
  });
  const searchRecord = harden({
    expirationDate: 100,
    strikePrice,
    timeAuthority: mockTimeAuthority,
    installation: mockInstallation,
    description: 'exerciseOption',
  });
  const getBucketKey = makeGetBucketKeyBasedOnSearchRecord(searchRecord);
  t.is(
    getBucketKey(invitationDetails),
    'description,exerciseOption,expirationDate,0,installation,1,strikePrice,0,timeAuthority,2',
  );
  t.is(
    getBucketKey(searchRecord),
    'description,exerciseOption,expirationDate,0,installation,1,strikePrice,0,timeAuthority,2',
  );
  // Our searchRecord MUST be in the same bucket as the full thing
  t.is(getBucketKey(invitationDetails), getBucketKey(searchRecord));
});
