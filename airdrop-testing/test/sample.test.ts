// @ts-nocheck
import test from '@endo/ses-ava/prepare-endo.js';
import type { TestFn } from 'ava';

let count = 0;
const incr = async () => {
  await true;
  count = count + 1;
};

test.serial('increment once', async t => {
  await incr();
  t.is(count, 1);
});

test.serial('increment twice', async t => {
  await incr();
  await incr();
  t.is(count, 2);
});
