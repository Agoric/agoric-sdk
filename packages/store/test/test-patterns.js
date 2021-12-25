// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeCopySet } from '../src/keys/copySet.js';
import { fit, matches, M } from '../src/patterns/patternMatchers.js';

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
    ],
    noPatterns: [
      [4, /3 - Must be equivalent to the literal pattern: 4/],
      [M.not(3), /3 - must fail negated pattern: 3/],
      [M.not(M.any()), /3 - must fail negated pattern: "\[match:any\]"/],
      [M.string(), /3 - Must have passStyle or tag "string"/],
      [[3, 4], /3 - Must be equivalent to the literal pattern: \[3,4\]/],
      [M.gte(7), /3 - Must be >= 7/],
      [M.lte(2), /3 - Must be <= 2/],
      // incommensurate comparisons are neither <= nor >=
      [M.lte('x'), /3 - Must be <= "x"/],
      [M.gte('x'), /3 - Must be >= "x"/],
      [M.and(3, 4), /3 - Must be equivalent to the literal pattern: 4/],
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
    ],
    noPatterns: [
      [[4, 3], /\[3,4\] - Must be equivalent to the literal pattern: \[4,3\]/],
      [[3], /\[3,4\] - Must be equivalent to the literal pattern: \[3\]/],
      [[M.string(), M.any()], /3 - Must have passStyle or tag "string"/],
      [M.lte([3, 3]), /\[3,4\] - Must be <= \[3,3\]/],
      [M.gte([4, 4]), /\[3,4\] - Must be >= \[4,4\]/],
      [M.lte([3]), /\[3,4\] - Must be <= \[3\]/],
      [M.gte([3, 4, 1]), /\[3,4\] - Must be >= \[3,4,1\]/],
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
    ],
    noPatterns: [
      [
        { foo: 4, bar: 3 },
        /{"foo":3,"bar":4} - Must be equivalent to the literal pattern: {"foo":4,"bar":3}/,
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
      [
        makeCopySet([]),
        /"\[copySet\]" - Must be equivalent to the literal pattern: "\[copySet\]"/,
      ],
      [
        makeCopySet([3, 4, 5]),
        /"\[copySet\]" - Must be equivalent to the literal pattern: "\[copySet\]"/,
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
