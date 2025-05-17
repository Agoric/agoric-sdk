// @ts-check
import test from 'ava';

import { E } from '@endo/far';
import { makeHeapZone } from '@agoric/base-zone/heap.js';

import { prepareBasicVowTools } from '../src/tools.js';
import { getVowPayload, isVow } from '../src/vow-utils.js';

test('asVow takes a function that throws/returns synchronously and returns a vow', async t => {
  const { watch, when, asVow } = prepareBasicVowTools(makeHeapZone());

  const fnThatThrows = () => {
    throw Error('fail');
  };

  const vowWithRejection = asVow(fnThatThrows);
  t.true(isVow(vowWithRejection));
  await t.throwsAsync(
    when(vowWithRejection),
    { message: 'fail' },
    'error should propogate as promise rejection',
  );

  const isWatchAble = watch(asVow(fnThatThrows));
  t.true(isVow(vowWithRejection));
  await t.throwsAsync(when(isWatchAble), { message: 'fail' });

  const fnThatReturns = () => {
    return 'early return';
  };
  const vowWithReturn = asVow(fnThatReturns);
  t.true(isVow(vowWithReturn));
  t.is(await when(vowWithReturn), 'early return');
  t.is(await when(watch(vowWithReturn)), 'early return');
});

test('asVow does not resolve a vow to a vow', async t => {
  const { watch, when, asVow } = prepareBasicVowTools(makeHeapZone());

  const testVow = watch(Promise.resolve('payload'));
  const testVowAsVow = asVow(() => testVow);

  const vowPayload = getVowPayload(testVowAsVow);
  assert(vowPayload?.vowV0, 'testVowAsVow is a vow');
  const unwrappedOnce = await E(vowPayload.vowV0).shorten();
  t.false(
    isVow(unwrappedOnce),
    'vows passed to asVow are not rewrapped as vows',
  );
  t.is(unwrappedOnce, 'payload');

  t.is(await when(testVow), await when(testVowAsVow), 'result is preserved');
});
