// @ts-nocheck
/* eslint-disable ava/no-ignored-test-files */

const test = require('ava');

test('deepEqual passes for deeply equal objects', t => {
  t.deepEqual(
    { num: 1, int: 2n, am: { brand: null, value: 3n } },
    { num: 1, int: 2n, am: { brand: null, value: 3n } },
  );
});

test('deepEqual fails for deeply different objects', t => {
  t.notDeepEqual({ num: 1 }, { num: 2 });
});
