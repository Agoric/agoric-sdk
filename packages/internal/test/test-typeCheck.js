// @ts-check
import test from 'ava';

import { M } from '@endo/patterns';
import { cast, mustMatch } from '../src/typeCheck.js';

const Mstring = /** @type {import('../src/types.js').TypedMatcher<string>} */ (
  M.string()
);

const unknownString = /** @type {unknown} */ ('');

test('cast', t => {
  // @ts-expect-error unknown type
  unknownString.length;
  // @ts-expect-error not any
  cast(unknownString, Mstring).missing;
  cast(unknownString, Mstring).length;
  t.pass();
});

test('mustMatch', t => {
  // @ts-expect-error unknown type
  unknownString.length;
  mustMatch(unknownString, Mstring);
  unknownString.length;
  t.pass();
});
