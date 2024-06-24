// @ts-check
import test from 'ava';

import { makeHeapZone } from '@agoric/base-zone/heap.js';

import { prepareVowTools } from '../src/tools.js';
import { isVow } from '../src/vow-utils.js';

test('asVow takes a function that throws/returns synchronously and returns a vow', async t => {
  const zone = makeHeapZone();
  const { watch, when, asVow } = prepareVowTools(zone);

  const fnThatThrows = () => {
    throw Error('fail');
  };

  const vowWithRejection = asVow(fnThatThrows);
  t.true(isVow(vowWithRejection));
  await t.throwsAsync(when(vowWithRejection), { message: 'fail' }, 'failure ');

  const isWatchAble = watch(asVow(fnThatThrows));
  t.true(isVow(vowWithRejection));
  await t.throwsAsync(when(isWatchAble), { message: 'fail' }, 'failure ');

  const fnThatReturns = () => {
    return 'early return';
  };
  const vowWithReturn = asVow(fnThatReturns);
  t.true(isVow(vowWithReturn));
  t.is(await when(vowWithReturn), 'early return');
  t.is(await when(watch(vowWithReturn)), 'early return');
});
