// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeCopyBag, makeCopyMap, makeCopySet } from '../src/keys/checkKey.js';
import {
  fit,
  matches,
  M,
  defaultLimits,
} from '../src/patterns/patternMatchers.js';
import '../src/types.js';

/**
 * @typedef MatchTest
 * @property {Passable} specimen
 * @property {Pattern[]} yesPatterns
 * @property {[Pattern, RegExp|string][]} noPatterns
 */

/** @type {MatchTest[]} */
const limitTests = harden([
  // decimalDigitsLimit
  {
    specimen: 379n,
    yesPatterns: [
      M.bigint(),
      M.bigint(harden({ decimalDigitsLimit: 3 })),
      M.nat(),
      M.nat(harden({ decimalDigitsLimit: 3 })),
    ],
    noPatterns: [
      [
        M.bigint({ decimalDigitsLimit: 2 }),
        'bigint "[379n]" must not have more than 2 digits',
      ],
      [
        M.nat({ decimalDigitsLimit: 2 }),
        'bigint "[379n]" must not have more than 2 digits',
      ],
    ],
  },
  {
    specimen: -379n,
    yesPatterns: [M.bigint(), M.bigint(harden({ decimalDigitsLimit: 3 }))],
    noPatterns: [
      [
        M.bigint({ decimalDigitsLimit: 2 }),
        'bigint "[-379n]" must not have more than 2 digits',
      ],
      [M.nat(), '"[-379n]" - Must be non-negative'],
      [M.nat({ decimalDigitsLimit: 2 }), '"[-379n]" - Must be non-negative'],
    ],
  },
  {
    specimen: 10n ** BigInt(defaultLimits.decimalDigitsLimit),
    yesPatterns: [
      M.bigint(harden({ decimalDigitsLimit: Infinity })),
      M.nat(harden({ decimalDigitsLimit: Infinity })),
    ],
    noPatterns: [
      [M.bigint(), /^bigint "\[1(0+)n\]" must not have more than 100 digits$/],
      [M.nat(), /^bigint "\[1(0+)n\]" must not have more than 100 digits$/],
    ],
  },
  {
    specimen: makeCopyBag(
      harden([
        ['z', 1n],
        ['x', 379n],
        ['a', 1n],
      ]),
    ),
    yesPatterns: [M.bag(), M.bagOf(M.string())],
    noPatterns: [
      [
        M.bag(harden({ decimalDigitsLimit: 2 })),
        'bag counts[1]: bigint "[379n]" must not have more than 2 digits',
      ],
      [
        M.bagOf(M.string(), undefined, harden({ decimalDigitsLimit: 2 })),
        'bag counts[1]: bigint "[379n]" must not have more than 2 digits',
      ],
    ],
  },
  // stringLengthLimit
  {
    specimen: 'moderate length string',
    yesPatterns: [M.string(), M.string(harden({ stringLengthLimit: 40 }))],
    noPatterns: [
      [
        M.string(harden({ stringLengthLimit: 10 })),
        'string "moderate length string" must not be bigger than 10',
      ],
    ],
  },
  {
    specimen: 'x'.repeat(defaultLimits.stringLengthLimit + 1),
    yesPatterns: [M.string(harden({ stringLengthLimit: Infinity }))],
    noPatterns: [
      [M.string(), /^string "(x+)" must not be bigger than 100000$/],
    ],
  },
  // symbolNameLengthLimit
  {
    specimen: Symbol.for('moderate length string'),
    yesPatterns: [M.symbol(), M.symbol(harden({ symbolNameLengthLimit: 40 }))],
    noPatterns: [
      [
        M.symbol(harden({ symbolNameLengthLimit: 10 })),
        'Symbol name "moderate length string" must not be bigger than 10',
      ],
    ],
  },
  {
    specimen: Symbol.for('x'.repeat(defaultLimits.symbolNameLengthLimit + 1)),
    yesPatterns: [M.symbol(harden({ symbolNameLengthLimit: Infinity }))],
    noPatterns: [
      [M.symbol(), /^Symbol name "(x+)" must not be bigger than 100$/],
    ],
  },
  // numPropertiesLimit, propertyNameLengthLimit
  {
    specimen: {
      z: 1000000n,
      x0123456789: 379n,
      a: 10000000n,
    },
    yesPatterns: [
      M.record(),
      M.record(harden({ numPropertiesLimit: 10, propertyNameLengthLimit: 20 })),
      M.recordOf(M.string(), M.bigint()),
      M.recordOf(
        M.string(),
        M.bigint(),
        harden({ numPropertiesLimit: 10, propertyNameLengthLimit: 20 }),
      ),
    ],
    noPatterns: [
      [
        M.record(harden({ numPropertiesLimit: 2 })),
        'Must not have more than 2 properties: {"z":"[1000000n]","x0123456789":"[379n]","a":"[10000000n]"}',
      ],
      [
        M.record(harden({ propertyNameLengthLimit: 5 })),
        'x0123456789: Property name must not be longer than 5',
      ],
    ],
  },
  // arrayLengthLimit
  {
    specimen: [...'moderate length string'],
    yesPatterns: [
      M.array(),
      M.arrayOf(M.string()),
      M.array(harden({ arrayLengthLimit: 40 })),
      M.arrayOf(M.string(), harden({ arrayLengthLimit: 40 })),
    ],
    noPatterns: [
      [
        M.array(harden({ arrayLengthLimit: 10 })),
        'Array length 22 must be <= limit 10',
      ],
      [M.arrayOf(M.number()), '[0]: string "m" - Must be a number'],
      [
        M.arrayOf(M.number(), harden({ arrayLengthLimit: 10 })),
        'Array length 22 must be <= limit 10',
      ],
      [
        M.arrayOf(M.string(), harden({ arrayLengthLimit: 10 })),
        'Array length 22 must be <= limit 10',
      ],
    ],
  },
  {
    specimen: Array(defaultLimits.arrayLengthLimit + 1).fill(1),
    yesPatterns: [M.array(harden({ arrayLengthLimit: Infinity }))],
    noPatterns: [[M.array(), 'Array length 10001 must be <= limit 10000']],
  },
  // numSetElementsLimit
  {
    specimen: makeCopySet([0, 1, 2, 3, 4, 5]),
    yesPatterns: [M.set(), M.setOf(M.number())],
    noPatterns: [
      [
        M.set(harden({ numSetElementsLimit: 3 })),
        'Set must not have more than 3 elements: 6',
      ],
    ],
  },
  // numUniqueBagElementsLimit
  {
    specimen: makeCopyBag([
      [0, 37n],
      [1, 3n],
      [2, 100000n],
      [3, 1n],
    ]),
    yesPatterns: [M.bag(), M.bagOf(M.number())],
    noPatterns: [
      [
        M.bag(harden({ numUniqueBagElementsLimit: 3 })),
        'Bag must not have more than 3 unique elements: "[copyBag]"',
      ],
    ],
  },
  // numMapEntriesLimit
  {
    specimen: makeCopyMap([
      [0, 37n],
      [1, 3n],
      [2, 100000n],
      [3, 1n],
    ]),
    yesPatterns: [M.mapOf(), M.mapOf(M.number(), M.nat())],
    noPatterns: [
      [
        M.map(harden({ numMapEntriesLimit: 3 })),
        'CopyMap must have no more than 3 entries: "[copyMap]"',
      ],
    ],
  },
]);

test('test pattern limits', t => {
  for (const { specimen, yesPatterns, noPatterns } of limitTests) {
    for (const yesPattern of yesPatterns) {
      t.notThrows(() => fit(specimen, yesPattern), `${yesPattern}`);
      t.assert(matches(specimen, yesPattern), `${yesPattern}`);
    }
    for (const [noPattern, msg] of noPatterns) {
      t.throws(
        () => fit(specimen, noPattern),
        { message: msg },
        `${noPattern}`,
      );
      t.false(matches(specimen, noPattern), `${noPattern}`);
    }
  }
});
