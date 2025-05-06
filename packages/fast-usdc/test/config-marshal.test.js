import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { Far } from '@endo/pass-style';
import { mustMatch } from '@endo/patterns';
import { AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { FeeConfigShape } from '../src/type-guards.js';
import {
  fromLegible,
  makeMarshalFromRecord,
  toLegible,
} from '../src/utils/config-marshal.js';

/**
 * @import {Amount, Brand, DepositFacet, NatValue, Payment} from '@agoric/ertp';
 */

const testMatches = (t, specimen, pattern) => {
  t.notThrows(() => mustMatch(specimen, pattern));
};

test('cross-vat configuration of Fast USDC FeeConfig', t => {
  const context = /** @type {const} */ ({
    /** @type {Brand<'nat'>} */
    USDC: Far('USDC Brand'),
  });

  const { USDC } = context;
  const { make } = AmountMath;
  const config = harden({
    flat: make(USDC, 100n),
    variableRate: makeRatio(1n, USDC),
    contractRate: makeRatio(20n, USDC),
  });
  testMatches(t, config, FeeConfigShape);

  const m = makeMarshalFromRecord(context);
  /** @type {any} */ // XXX struggling with recursive type
  const legible = toLegible(m.toCapData(config));

  t.deepEqual(legible, {
    structure: {
      contractRate: {
        denominator: {
          brand: '$0.Alleged: USDC Brand',
          value: '+100',
        },
        numerator: {
          brand: '$0',
          value: '+20',
        },
      },
      flat: { brand: '$0', value: '+100' },
      variableRate: {
        denominator: {
          brand: '$0',
          value: '+100',
        },
        numerator: {
          brand: '$0',
          value: '+1',
        },
      },
    },
    slots: ['USDC'],
  });
  t.deepEqual(legible.slots, Object.keys(context));

  const actual = m.fromCapData(fromLegible(legible));
  t.deepEqual(actual, config);
});
