import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Far } from '@endo/pass-style';
import { mustMatch } from '@endo/patterns';
import { AmountMath } from '@agoric/ertp';
import { FastUSDCTermsShape } from '../src/type-guards.js';
import {
  fromLegible,
  makeMarshalFromRecord,
  toLegible,
} from '../src/utils/config-marshal.js';

/** @import {SmallCapsStructureOf} from '../src/utils/config-marshal.js' */

const testMatches = (t, specimen, pattern) => {
  t.notThrows(() => mustMatch(specimen, pattern));
};

test('cross-vat configuration of Fast USDC terms', t => {
  const context = /** @type {const} */ ({
    /** @type {Brand<'nat'>} */
    USDC: Far('USDC Brand'),
  });

  const { USDC } = context;
  const { make } = AmountMath;
  const config = harden({
    poolFee: make(USDC, 150n),
    contractFee: make(USDC, 200n),
    usdcDenom: 'ibc/usdconagoric',
  });
  testMatches(t, config, FastUSDCTermsShape);

  const m = makeMarshalFromRecord(context);
  /** @type {any} */ // XXX struggling with recursive type
  const legible = toLegible(m.toCapData(config));

  t.deepEqual(legible, {
    structure: {
      contractFee: { brand: '$0.Alleged: USDC Brand', value: '+200' },
      poolFee: { brand: '$0', value: '+150' },
      usdcDenom: 'ibc/usdconagoric',
    },
    slots: ['USDC'],
  });
  t.deepEqual(legible.slots, Object.keys(context));

  const actual = m.fromCapData(fromLegible(legible));
  t.deepEqual(actual, config);
});
