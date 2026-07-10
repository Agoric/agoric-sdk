// @ts-check
import '@endo/init/debug.js';

import test from 'ava';

import { makeExo } from '@endo/exo';
import { M } from '@endo/patterns';
import { cast, mustMatch } from '../src/typeCheck.js';

/**
 * @import {CastedPattern} from '@endo/patterns';
 * @import {RemotableObject} from '@endo/marshal';
 */

const Mstring = /** @type {CastedPattern<string>} */ (M.string());
const MremotableFoo = /** @type {CastedPattern<RemotableObject<'Foo'>>} */ (
  M.remotable('Foo')
);
const MremotableBar = /** @type {CastedPattern<RemotableObject<'Bar'>>} */ (
  M.remotable('Bar')
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

test('remotable', t => {
  const maybeFoo = makeExo(`Remotable1`, undefined, {});
  mustMatch(maybeFoo, MremotableFoo);
  maybeFoo; // narrowed to Foo

  const maybeBar = makeExo(`Remotable2`, undefined, {});
  mustMatch(maybeBar, MremotableBar);
  maybeBar; // narrowed to Bar

  mustMatch(maybeFoo, MremotableBar);
  maybeFoo; // further narrowed to never
  mustMatch(maybeBar, MremotableFoo);
  maybeBar; // further narrowed to never

  t.pass();
});
