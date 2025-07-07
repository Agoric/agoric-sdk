/* eslint-env node */
import test from 'ava';

import { toCLIOptions } from '../src/cli-utils.js';

test('undefined', t => {
  t.deepEqual(toCLIOptions({ undef: undefined }), []);
});

test('boolean', t => {
  t.deepEqual(toCLIOptions({ true: true, false: false }), [
    '--true',
    '--no-false',
  ]);
});

test('string', t => {
  t.deepEqual(toCLIOptions({ str: 'foo', emptyStr: '' }), [
    '--str',
    'foo',
    '--emptyStr',
    '',
  ]);
});

test('string array', t => {
  t.deepEqual(toCLIOptions({ one: ['foo'], two: ['foo', 'bar'] }), [
    '--one',
    'foo',
    '--two',
    'foo',
    '--two',
    'bar',
  ]);
});

test('composite', t => {
  t.deepEqual(
    toCLIOptions({
      undef: undefined,
      true: true,
      false: false,
      str: 'foo',
      emptyStr: '',
      one: ['foo'],
      two: ['foo', 'bar'],
    }),
    [
      '--true',
      '--no-false',
      '--str',
      'foo',
      '--emptyStr',
      '',
      '--one',
      'foo',
      '--two',
      'foo',
      '--two',
      'bar',
    ],
  );
});
