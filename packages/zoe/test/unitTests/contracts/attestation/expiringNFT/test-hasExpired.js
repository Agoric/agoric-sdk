// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';
import { hasExpired } from '../../../../../src/contracts/attestation/expiring/expiringHelpers.js';

test('expiration before current time', async t => {
  const expiration = 1n;
  const currentTime = 2n;
  t.true(hasExpired(expiration, currentTime));
});

test('expiration equals current time', async t => {
  const expiration = 2n;
  const currentTime = 2n;
  t.false(hasExpired(expiration, currentTime));
});

test('expiration after current time', async t => {
  const expiration = 3n;
  const currentTime = 2n;
  t.false(hasExpired(expiration, currentTime));
});
