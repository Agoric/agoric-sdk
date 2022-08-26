// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { makeTagged } from '@endo/marshal';
import { makeCopyBag, makeCopyMap, makeCopySet } from '../src/keys/checkKey.js';
import { fit, matches, M } from '../src/patterns/patternMatchers.js';
import '../src/types.js';

/**
 * @typedef MatchTest
 * @property {Passable} specimen
 * @property {Pattern[]} yesPatterns
 * @property {[Pattern, RegExp|string][]} noPatterns
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
      [4, '3 - Must be: 4'],
      [M.not(3), '3 - Must fail negated pattern: 3'],
      [M.not(M.any()), '3 - Must fail negated pattern: "[match:any]"'],
      [M.string(), 'number 3 - Must be a string'],
      [[3, 4], '3 - Must be: [3,4]'],
      [M.gte(7), '3 - Must be >= 7'],
      [M.lte(2), '3 - Must be <= 2'],
      // incommensurate comparisons are neither <= nor >=
      [M.lte('x'), '3 - Must be <= "x"'],
      [M.gte('x'), '3 - Must be >= "x"'],
      [M.and(3, 4), '3 - Must be: 4'],
      [M.or(4, 4), '3 - Must match one of [4,4]'],
      [M.or(), '3 - no pattern disjuncts to match: []'],
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
      M.arrayOf(M.number()),
    ],
    noPatterns: [
      [[4, 3], '[3,4] - Must be: [4,3]'],
      [[3], '[3,4] - Must be: [3]'],
      [[M.string(), M.any()], '[0]: number 3 - Must be a string'],
      [M.lte([3, 3]), '[3,4] - Must be <= [3,3]'],
      [M.gte([4, 4]), '[3,4] - Must be >= [4,4]'],
      [M.lte([3]), '[3,4] - Must be <= [3]'],
      [M.gte([3, 4, 1]), '[3,4] - Must be >= [3,4,1]'],

      [M.split([3, 4, 5, 6]), 'required-parts: [3,4] - Must be: [3,4,5,6]'],
      [M.split([5]), 'required-parts: [3] - Must be: [5]'],
      [M.split({}), 'copyArray [3,4] - Must be a copyRecord'],
      [M.split([3], 'x'), 'rest-parts: [4] - Must be: "x"'],

      [M.partial([5]), 'optional-parts: [3] - Must be: [5]'],

      [M.scalar(), 'A "copyArray" cannot be a scalar key: [3,4]'],
      [M.set(), 'copyArray [3,4] - Must be a copySet'],
      [M.arrayOf(M.string()), '[0]: number 3 - Must be a string'],
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

      M.split(
        { foo: M.number() },
        M.and(M.partial({ bar: M.number() }), M.partial({ baz: M.number() })),
      ),

      M.split(
        { foo: M.number() },
        M.partial({ bar: M.number(), baz: M.number() }),
      ),

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
      M.recordOf(M.string(), M.number()),
    ],
    noPatterns: [
      [{ foo: 4, bar: 3 }, '{"foo":3,"bar":4} - Must be: {"foo":4,"bar":3}'],
      [{ foo: M.string(), bar: M.any() }, 'foo: number 3 - Must be a string'],
      [
        M.lte({ foo: 3, bar: 3 }),
        '{"foo":3,"bar":4} - Must be <= {"foo":3,"bar":3}',
      ],
      [
        M.gte({ foo: 4, bar: 4 }),
        '{"foo":3,"bar":4} - Must be >= {"foo":4,"bar":4}',
      ],

      // Incommensurates are neither greater nor less
      [M.gte({ foo: 3 }), '{"foo":3,"bar":4} - Must be >= {"foo":3}'],
      [M.lte({ foo: 3 }), '{"foo":3,"bar":4} - Must be <= {"foo":3}'],
      [
        M.gte({ foo: 3, bar: 4, baz: 5 }),
        '{"foo":3,"bar":4} - Must be >= {"foo":3,"bar":4,"baz":5}',
      ],
      [
        M.lte({ foo: 3, bar: 4, baz: 5 }),
        '{"foo":3,"bar":4} - Must be <= {"foo":3,"bar":4,"baz":5}',
      ],
      [M.lte({ baz: 3 }), '{"foo":3,"bar":4} - Must be <= {"baz":3}'],
      [M.gte({ baz: 3 }), '{"foo":3,"bar":4} - Must be >= {"baz":3}'],

      [
        M.split(
          { foo: M.number() },
          M.and(M.partial({ bar: M.string() }), M.partial({ baz: M.number() })),
        ),
        'rest-parts: optional-parts: bar: number 4 - Must be a string',
      ],

      [M.split([]), 'copyRecord {"foo":3,"bar":4} - Must be a copyArray'],
      [
        M.split({ foo: 3, z: 4 }),
        'required-parts: {"foo":3} - Must be: {"foo":3,"z":4}',
      ],
      [
        M.split({ foo: 3 }, { foo: 3, bar: 4 }),
        'rest-parts: {"bar":4} - Must be: {"foo":3,"bar":4}',
      ],
      [
        M.split({ foo: 3 }, { foo: M.any(), bar: 4 }),
        'rest-parts: {"bar":4} - Must have missing properties ["foo"]',
      ],
      [
        M.partial({ foo: 7, zip: 5 }, { bar: 4 }),
        'optional-parts: {"foo":3} - Must be: {"foo":7}',
      ],

      [M.scalar(), 'A "copyRecord" cannot be a scalar key: {"foo":3,"bar":4}'],
      [M.map(), 'copyRecord {"foo":3,"bar":4} - Must be a copyMap'],
      [
        M.recordOf(M.number(), M.number()),
        'foo: [0]: string "foo" - Must be a number',
      ],
      [
        M.recordOf(M.string(), M.string()),
        'foo: [1]: number 3 - Must be a string',
      ],
    ],
  },
  {
    specimen: makeCopySet([3, 4]),
    yesPatterns: [
      makeCopySet([4, 3]),
      M.gte(makeCopySet([])),
      M.lte(makeCopySet([3, 4, 5])),
      M.set(),
      M.setOf(M.number()),
    ],
    noPatterns: [
      [makeCopySet([]), '"[copySet]" - Must be: "[copySet]"'],
      [makeCopySet([3, 4, 5]), '"[copySet]" - Must be: "[copySet]"'],
      [M.lte(makeCopySet([])), '"[copySet]" - Must be <= "[copySet]"'],
      [M.gte(makeCopySet([3, 4, 5])), '"[copySet]" - Must be >= "[copySet]"'],
      [M.bag(), 'copySet "[copySet]" - Must be a copyBag'],
      [M.setOf(M.string()), '[0]: number 4 - Must be a string'],
    ],
  },
  {
    specimen: makeCopyBag([
      ['a', 2n],
      ['b', 3n],
    ]),
    yesPatterns: [
      M.gt(makeCopyBag([])),
      M.gt(makeCopyBag([['a', 2n]])),
      M.gt(
        makeCopyBag([
          ['a', 1n],
          ['b', 3n],
        ]),
      ),
      M.bag(),
      M.bagOf(M.string()),
      M.bagOf(M.string(), M.lt(5n)),
    ],
    noPatterns: [
      [
        M.gte(
          makeCopyBag([
            ['b', 2n],
            ['c', 1n],
          ]),
        ),
        '"[copyBag]" - Must be >= "[copyBag]"',
      ],
      [
        M.lte(
          makeCopyBag([
            ['b', 2n],
            ['c', 1n],
          ]),
        ),
        '"[copyBag]" - Must be <= "[copyBag]"',
      ],
      [M.bagOf(M.boolean()), 'keys[0]: string "b" - Must be a boolean'],
      [M.bagOf('b'), 'keys[1]: "a" - Must be: "b"'],
      [M.bagOf(M.any(), M.gt(5n)), 'counts[0]: "[3n]" - Must be > "[5n]"'],
      [M.bagOf(M.any(), M.gt(2n)), 'counts[1]: "[2n]" - Must be > "[2n]"'],
    ],
  },
  {
    specimen: makeCopyMap([
      [{}, 'a'],
      [{ foo: 3 }, 'b'],
    ]),
    yesPatterns: [
      // M.gt(makeCopyMap([])), Map comparison not yet implemented
      M.map(),
      M.mapOf(M.record(), M.string()),
    ],
    noPatterns: [
      [M.bag(), 'copyMap "[copyMap]" - Must be a copyBag'],
      [M.set(), 'copyMap "[copyMap]" - Must be a copySet'],
      [
        M.mapOf(M.string(), M.string()),
        'keys[0]: copyRecord {"foo":3} - Must be a string',
      ],
      [
        M.mapOf(M.record(), M.number()),
        'values[0]: string "b" - Must be a number',
      ],
    ],
  },
  {
    specimen: makeTagged('mysteryTag', 88),
    yesPatterns: [M.any(), M.not(M.pattern())],
    noPatterns: [
      [
        M.pattern(),
        'A passable tagged "mysteryTag" is not a pattern: "[mysteryTag]"',
      ],
    ],
  },
  {
    specimen: makeTagged('match:any', undefined),
    yesPatterns: [M.any(), M.pattern()],
    noPatterns: [
      [M.key(), 'A passable tagged "match:any" is not a key: "[match:any]"'],
    ],
  },
  {
    specimen: makeTagged('match:any', 88),
    yesPatterns: [M.any(), M.not(M.pattern())],
    noPatterns: [[M.pattern(), 'match:any payload: 88 - Must be undefined']],
  },
  {
    specimen: makeTagged('match:remotable', 88),
    yesPatterns: [M.any(), M.not(M.pattern())],
    noPatterns: [
      [
        M.pattern(),
        'match:remotable payload: 88 - Must be a copyRecord to match a copyRecord pattern: {"label":"[match:string]"}',
      ],
    ],
  },
  {
    specimen: makeTagged('match:remotable', harden({ label: 88 })),
    yesPatterns: [M.any(), M.not(M.pattern())],
    noPatterns: [
      [
        M.pattern(),
        'match:remotable payload: label: number 88 - Must be a string',
      ],
    ],
  },
  {
    specimen: makeTagged('match:recordOf', harden([M.string(), M.nat()])),
    yesPatterns: [M.pattern()],
    noPatterns: [
      [
        M.key(),
        'A passable tagged "match:recordOf" is not a key: "[match:recordOf]"',
      ],
    ],
  },
  {
    specimen: makeTagged(
      'match:recordOf',
      harden([M.string(), Promise.resolve(null)]),
    ),
    yesPatterns: [M.any(), M.not(M.pattern())],
    noPatterns: [
      [
        M.pattern(),
        'match:recordOf payload: [1]: A "promise" cannot be a pattern',
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

test('masking match failure', t => {
  const nonSet = makeTagged('copySet', harden([M.string()]));
  const nonBag = makeTagged('copyBag', harden([[M.string(), 8n]]));
  const nonMap = makeTagged(
    'copyMap',
    harden({ keys: [M.string()], values: ['x'] }),
  );
  t.throws(() => fit(nonSet, M.set()), {
    message: 'A passable tagged "match:string" is not a key: "[match:string]"',
  });
  t.throws(() => fit(nonBag, M.bag()), {
    message: 'A passable tagged "match:string" is not a key: "[match:string]"',
  });
  t.throws(() => fit(nonMap, M.map()), {
    message: 'A passable tagged "match:string" is not a key: "[match:string]"',
  });
});

test('well formed patterns', t => {
  // @ts-expect-error purposeful type violation for testing
  t.throws(() => M.remotable(88), {
    message: 'match:remotable payload: label: number 88 - Must be a string',
  });
});
