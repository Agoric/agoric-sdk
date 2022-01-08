// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeCopySet } from '../src/keys/copySet.js';
import { fit, matches, M } from '../src/patterns/patternMatchers.js';
import '../src/types.js';

/**
 * @typedef MatchTest
 * @property {Passable} specimen
 * @property {Pattern[]} yesPatterns
 * @property {[Pattern, RegExp][]} noPatterns
 */

/** @type {MatchTest[]} */
const matchTests = harden([
  {
    specimen: 3,
    yesPatterns: [
      3,
      M.any(),
      M.not(4),
      M.kind('number'),
      M.number(),
      M.lte(7),
      M.gte(2),
      M.and(3, 3),
      M.or(3, 4),
      M.and(),

      M.scalar(),
      M.key(),
      M.pattern(),
    ],
    noPatterns: [
      [4, /3 - Must be equivalent to: 4/],
      [M.not(3), /3 - must fail negated pattern: 3/],
      [M.not(M.any()), /3 - must fail negated pattern: "\[match:any\]"/],
      [M.string(), /3 - Must have passStyle or tag "string"/],
      [[3, 4], /3 - Must be equivalent to: \[3,4\]/],
      [M.gte(7), /3 - Must be >= 7/],
      [M.lte(2), /3 - Must be <= 2/],
      // incommensurate comparisons are neither <= nor >=
      [M.lte('x'), /3 - Must be <= "x"/],
      [M.gte('x'), /3 - Must be >= "x"/],
      [M.and(3, 4), /3 - Must be equivalent to: 4/],
      [M.or(4, 4), /3 - Must match one of \[4,4\]/],
      [M.or(), /3 - no pattern disjuncts to match: \[\]/],
    ],
  },
  {
    specimen: [3, 4],
    yesPatterns: [
      [3, 4],
      [M.number(), M.any()],
      [M.lte(3), M.gte(3)],
      // Arrays compare lexicographically
      M.gte([3, 3]),
      M.lte([4, 4]),
      M.gte([3]),
      M.lte([3, 4, 1]),

      M.split([3], [4]),
      M.split([3]),
      M.split([3], M.array()),
      M.split([3, 4], []),
      M.split([], [3, 4]),

      M.partial([3], [4]),
      M.partial([3, 4, 5, 6]),
      M.partial([3, 4, 5, 6], []),

      M.array(),
      M.key(),
      M.pattern(),
    ],
    noPatterns: [
      [[4, 3], /\[3,4\] - Must be equivalent to: \[4,3\]/],
      [[3], /\[3,4\] - Must be equivalent to: \[3\]/],
      [[M.string(), M.any()], /3 - Must have passStyle or tag "string"/],
      [M.lte([3, 3]), /\[3,4\] - Must be <= \[3,3\]/],
      [M.gte([4, 4]), /\[3,4\] - Must be >= \[4,4\]/],
      [M.lte([3]), /\[3,4\] - Must be <= \[3\]/],
      [M.gte([3, 4, 1]), /\[3,4\] - Must be >= \[3,4,1\]/],

      [M.split([3, 4, 5, 6]), /\[3,4\] - Must be equivalent to: \[3,4,5,6\]/],
      [M.split([5]), /\[3\] - Must be equivalent to: \[5\]/],
      [M.split({}), /\[3,4\] - Must have shape of base: "copyRecord"/],
      [M.split([3], 'x'), /Remainder \[4\] - Must match "x"/],

      [M.partial([5]), /\[3\] - Must be equivalent to: \[5\]/],

      [M.scalar(), /A "copyArray" cannot be a scalar key: \[3,4\]/],
    ],
  },
  {
    specimen: { foo: 3, bar: 4 },
    yesPatterns: [
      { foo: 3, bar: 4 },
      { foo: M.number(), bar: M.any() },
      { foo: M.lte(3), bar: M.gte(3) },
      // Records compare pareto
      M.gte({ foo: 3, bar: 3 }),
      M.lte({ foo: 4, bar: 4 }),

      M.split({ foo: 3 }, { bar: 4 }),
      M.split({ bar: 4 }, { foo: 3 }),
      M.split({ foo: 3 }),
      M.split({ foo: 3 }, M.record()),
      M.split({}, { foo: 3, bar: 4 }),
      M.split({ foo: 3, bar: 4 }, {}),

      M.partial({ zip: 5, zap: 6 }),
      M.partial({ zip: 5, zap: 6 }, { foo: 3, bar: 4 }),
      M.partial({ foo: 3, zip: 5 }, { bar: 4 }),

      M.record(),
      M.key(),
      M.pattern(),
    ],
    noPatterns: [
      [
        { foo: 4, bar: 3 },
        /{"foo":3,"bar":4} - Must be equivalent to: {"foo":4,"bar":3}/,
      ],
      [
        { foo: M.string(), bar: M.any() },
        /3 - Must have passStyle or tag "string"/,
      ],
      [
        M.lte({ foo: 3, bar: 3 }),
        /{"foo":3,"bar":4} - Must be <= {"foo":3,"bar":3}/,
      ],
      [
        M.gte({ foo: 4, bar: 4 }),
        /{"foo":3,"bar":4} - Must be >= {"foo":4,"bar":4}/,
      ],

      // Incommensurates are neither greater nor less
      [M.gte({ foo: 3 }), /{"foo":3,"bar":4} - Must be >= {"foo":3}/],
      [M.lte({ foo: 3 }), /{"foo":3,"bar":4} - Must be <= {"foo":3}/],
      [
        M.gte({ foo: 3, bar: 4, baz: 5 }),
        /{"foo":3,"bar":4} - Must be >= {"foo":3,"bar":4,"baz":5}/,
      ],
      [
        M.lte({ foo: 3, bar: 4, baz: 5 }),
        /{"foo":3,"bar":4} - Must be <= {"foo":3,"bar":4,"baz":5}/,
      ],
      [M.lte({ baz: 3 }), /{"foo":3,"bar":4} - Must be <= {"baz":3}/],
      [M.gte({ baz: 3 }), /{"foo":3,"bar":4} - Must be >= {"baz":3}/],

      [M.split([]), /{"foo":3,"bar":4} - Must have shape of base: "copyArray"/],
      [
        M.split({ foo: 3, z: 4 }),
        /{"foo":3} - Must be equivalent to: {"foo":3,"z":4}/,
      ],
      [
        M.split({ foo: 3 }, { foo: 3, bar: 4 }),
        /Remainder {"bar":4} - Must match {"foo":3,"bar":4}/,
      ],
      [
        M.partial({ foo: 7, zip: 5 }, { bar: 4 }),
        /{"foo":3} - Must be equivalent to: {"foo":7}/,
      ],

      [M.scalar(), /A "copyRecord" cannot be a scalar key: {"foo":3,"bar":4}/],
    ],
  },
  {
    specimen: makeCopySet([3, 4]),
    yesPatterns: [
      makeCopySet([4, 3]),
      M.gte(makeCopySet([])),
      M.lte(makeCopySet([3, 4, 5])),
    ],
    noPatterns: [
      [makeCopySet([]), /"\[copySet\]" - Must be equivalent to: "\[copySet\]"/],
      [
        makeCopySet([3, 4, 5]),
        /"\[copySet\]" - Must be equivalent to: "\[copySet\]"/,
      ],
      [M.lte(makeCopySet([])), /"\[copySet\]" - Must be <= "\[copySet\]"/],
      [
        M.gte(makeCopySet([3, 4, 5])),
        /\[copySet\]" - Must be >= "\[copySet\]"/,
      ],
    ],
  },
]);

test('test simple matches', t => {
  for (const { specimen, yesPatterns, noPatterns } of matchTests) {
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
