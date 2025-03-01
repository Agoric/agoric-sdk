// @ts-check
import test from 'ava';

import { fc, testProp } from '@fast-check/ava';
import { Far } from '@endo/far';
import { deepMapObject, makeMeasureSeconds } from '../src/js-utils.js';
import {
  assertAllDefined,
  attenuate,
  whileTrue,
  untilTrue,
  forever,
  deeplyFulfilledObject,
  synchronizedTee,
} from '../src/ses-utils.js';

/** @import {Permit, Attenuated} from '../src/types.js'; */
/** @import {Arbitrary} from 'fast-check'; */

const { ownKeys } = Reflect;
const defineDataProperty = (obj, key, value) =>
  Object.defineProperty(obj, key, {
    value,
    configurable: true,
    enumerable: true,
    writable: true,
  });

/**
 * A predicate for matching non-null non-function objects. Note that this
 * category includes arrays and other built-in exotic objects.
 *
 * @param {unknown} x
 * @returns {x is (Array | Record<PropertyKey, unknown>)}
 */
const hasObjectType = x => x !== null && typeof x === 'object';

const fastShrink = { withCrossShrink: true };
const arbUndefined = fc.constant(undefined);
const arbString = fc.oneof(
  fastShrink,
  fc.string(),
  fc.string(/** @type {any} */ ({ unit: 'binary' })),
);
const arbKey = fc.oneof(
  fastShrink,
  arbString,
  arbString.map(s => Symbol(s)),
  arbString.map(s => Symbol.for(s)),
);
const arbPrimitive = fc.oneof(
  fastShrink,
  fc.constantFrom(null, undefined, false, true),
  arbKey,
  fc.bigInt(),
  fc.double(),
);
const arbLowerLetter = fc.constantFrom(
  ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(0x61 + i)),
);
const arbFunction = fc
  .string(
    /** @type {any} */ ({ unit: arbLowerLetter, minLength: 1, maxLength: 20 }),
  )
  .map(name => ({ [name]: () => {} })[name]);
const { value: arbShallow } = fc.letrec(tie => ({
  value: fc.oneof(
    { ...fastShrink, maxDepth: 2 },
    arbPrimitive,
    arbFunction,
    fc.array(tie('value')),
    fc
      .uniqueArray(fc.tuple(arbKey, tie('value')), {
        selector: entry => entry[0],
      })
      .map(entries => Object.fromEntries(entries)),
  ),
}));

// #region attenuate
{
  const arbPermitLeaf = fc.oneof(fastShrink, fc.constant(true), arbString);
  /**
   * @template [T=unknown]
   * @template {Permit<T>} [P=Permit<T>]
   * @typedef {{
   *   specimen: T;
   *   permit: P;
   *   attenuation: Attenuated<T, P>;
   *   problem:
   *     | undefined
   *     | 'bad permit'
   *     | 'bad specimen'
   *     | 'specimen missing key';
   * }} AttenuateTestCase
   */

  /**
   * An Arbitrary for generating `attenuate` test cases, including those in
   * which either or both of the permit and specimen may be invalid in some
   * way.
   *
   * @template {AttenuateTestCase} T
   * @template B
   * @param {Arbitrary<T>} arbRecursive a self-reference for recursion
   * @param {Arbitrary<B>} [arbBad] for generating a "bad" value. Required by
   *   `makeBad`.
   * @param {(testCase: T, badValue: B) => T} [makeBad] derive a "bad" test case
   *   from a generic one and a value from `arrBad`
   * @returns {Arbitrary<T>}
   */
  const makeArbTestCase = (arbRecursive, arbBad, makeBad) => {
    /** Test case for an arbitrary value with no attenuation. */
    const base = fc
      .tuple(arbShallow, arbPermitLeaf)
      .map(([specimen, permit]) => ({
        specimen,
        permit,
        attenuation: specimen,
        problem: undefined,
      }));

    if (makeBad && !arbBad) throw Error('arbBad is required with makeBad');
    // eslint-disable-next-line no-self-assign
    arbBad = /** @type {Arbitrary<B>} */ (arbBad);
    const badBase =
      makeBad &&
      fc.tuple(base, arbBad).map((testCase, bad) => makeBad(testCase, bad));

    const recurse = /** @type {Arbitrary<T>} */ (
      fc
        .uniqueArray(
          fc.record({
            name: arbString,
            subCase: arbRecursive,
            skip: fc.boolean(),
            corruption: arbBad ? fc.oneof(arbBad, arbUndefined) : arbUndefined,
          }),
          {
            selector: propRecord => propRecord.name,
            maxLength: 5,
          },
        )
        .map(propRecords => {
          const specimen = {};
          const permit = {};
          const attenuation = {};
          let problem;
          for (const propRecord of propRecords) {
            const { name, skip, corruption } = propRecord;
            let { subCase } = /** @type {{ subCase: T }} */ (propRecord);
            defineDataProperty(specimen, name, subCase.specimen);
            if (skip) continue;
            problem ||= subCase.problem;
            if (!problem && corruption) {
              // @ts-expect-error TS2722 makeBad is not undefined here
              subCase = makeBad(subCase, corruption);
              defineDataProperty(specimen, name, subCase.specimen);
              problem = subCase.problem;
            }
            defineDataProperty(permit, name, subCase.permit);
            defineDataProperty(attenuation, name, subCase.attenuation);
          }
          return { specimen, permit, attenuation, problem };
        })
    );

    return fc.oneof(
      fastShrink,
      .../** @type {Arbitrary<T>[]} */ (makeBad ? [badBase, base] : [base]),
      recurse,
    );
  };

  const {
    goodCase: arbGoodCase,
    badPermit: arbBadPermit,
    badSpecimen: arbBadSpecimen,
    specimenMissingKey: arbSpecimenMissingKey,
  } = fc.letrec(tie => ({
    // Happy-path test cases.
    goodCase: makeArbTestCase(tie('goodCase')),

    // Test cases in which the permit is invalid.
    badPermit: makeArbTestCase(
      tie('badPermit'),
      arbShallow.filter(
        x => x !== true && typeof x !== 'string' && !hasObjectType(x),
      ),
      (testCase, badPermit) => {
        testCase.permit = badPermit;
        testCase.problem = 'bad permit';
        return testCase;
      },
    ).filter(
      testCase => !!(/** @type {AttenuateTestCase} */ (testCase).problem),
    ),

    // Test cases in which the permit is an object but the specimen is not.
    badSpecimen: makeArbTestCase(
      tie('badSpecimen'),
      fc.oneof(arbPrimitive, arbFunction),
      (testCase, badSpecimen) => {
        if (!hasObjectType(testCase.permit)) testCase.permit = {};
        testCase.specimen = badSpecimen;
        testCase.problem = 'bad specimen';
        return testCase;
      },
    ).filter(
      testCase => !!(/** @type {AttenuateTestCase} */ (testCase).problem),
    ),

    // Test cases in which the specimen is missing a permit property.
    specimenMissingKey: makeArbTestCase(
      tie('specimenMissingKey'),
      arbString,
      (testCase, prop) => {
        if (!hasObjectType(testCase.specimen)) testCase.specimen = {};
        if (!hasObjectType(testCase.permit)) {
          testCase.permit = { [prop]: true };
        }
        // Some properties are not configurable (e.g., an array's `length`), so
        // accept failure as an option.
        try {
          delete (/** @type {any} */ (testCase.specimen)[prop]);
          testCase.problem = 'specimen missing key';
          // eslint-disable-next-line no-empty
        } catch (err) {}
        return testCase;
      },
    ).filter(
      testCase => !!(/** @type {AttenuateTestCase} */ (testCase).problem),
    ),
  }));

  test('attenuate static cases', t => {
    const specimen = {
      foo: 'bar',
      baz: [42],
      deep: { qux: 1, quux: 2, quuux: 3 },
    };
    const { foo, baz, deep } = specimen;

    t.is(
      attenuate(specimen, true),
      specimen,
      'blanket permit must preserve identity',
    );
    t.is(
      attenuate(specimen, 'ok'),
      specimen,
      'blanket string permit must preserve identity',
    );
    const deepExtraction = attenuate(specimen, { deep: true });
    t.deepEqual(deepExtraction, { deep });
    t.is(
      deepExtraction.deep,
      deep,
      'deep permit must preserve identity at its depth',
    );

    /** @typedef {Pick<AttenuateTestCase, 'permit' | 'attenuation'>} PartialCase */
    /** @type {Record<string, PartialCase>} */
    const cases = {
      'pick 1': { permit: { deep: true }, attenuation: { deep } },
      'pick 2': {
        permit: { foo: true, baz: true },
        attenuation: { foo, baz },
      },
      'pick 3': {
        permit: { foo: true, baz: true, deep: true },
        attenuation: { foo, baz, deep },
      },
      hollow: {
        permit: { foo: true, deep: {} },
        attenuation: { foo, deep: {} },
      },
      deep: {
        permit: { foo, deep: { quux: true } },
        attenuation: { foo, deep: { quux: 2 } },
      },
    };
    for (const [label, testCase] of Object.entries(cases)) {
      const { permit, attenuation: expected } = testCase;
      const actual = attenuate(specimen, permit);
      // eslint-disable-next-line ava/assertion-arguments
      t.deepEqual(actual, expected, label);
    }
  });

  testProp(
    'attenuate',
    /** @type {any} */ ([arbGoodCase]),
    // @ts-expect-error TS2345 function signature
    async (t, { specimen, permit, attenuation }) => {
      const actualAttenuation = attenuate(specimen, permit);
      t.deepEqual(actualAttenuation, attenuation);
    },
  );

  test('attenuate - transform static cases', t => {
    const specimen = {
      foo: 'bar',
      arr: [42],
      empty: {},
      deep: { qux: 1, quux: 2, quuux: 3 },
    };
    const { foo, arr, empty, deep } = specimen;
    const deepClone = { ...deep };

    const marked = true;
    const attenuation = attenuate(
      specimen,
      { foo: true, arr: true, empty: {}, deep: true },
      /** @type {any} */ (obj => Object.assign(obj, { marked })),
    );
    const expected = { marked, foo, arr, empty: { marked }, deep: deepClone };
    t.deepEqual(attenuation, expected);
    for (const [label, obj] of Object.entries({
      specimen,
      'array in specimen': arr,
      'object in specimen': empty,
      'whole object in specimen': deep,
    })) {
      // @ts-expect-error
      t.is(obj.marked, undefined, `transformation must not affect ${label}`);
    }
  });

  testProp(
    'attenuate - transform',
    /** @type {any} */ ([
      arbGoodCase.filter(({ specimen }) => hasObjectType(specimen)),
    ]),
    // @ts-expect-error TS2345 function signature
    async (t, { specimen, permit }) => {
      const tag = Symbol('transformed');

      let mutationCallCount = 0;
      const mutatedAttenuation = attenuate(specimen, permit, obj => {
        mutationCallCount += 1;
        obj[tag] = true;
        return obj;
      });
      let mutationOk = true;
      (function visit(subObj, subPermit) {
        if (subPermit === true || typeof subPermit === 'string') return;
        mutationOk &&= subObj[tag];
        const allKeys = [...ownKeys(subObj), ...ownKeys(subPermit)];
        for (const k of new Set(allKeys)) {
          if (k === tag) continue;
          visit(subObj[k], subPermit[k]);
        }
      })(mutatedAttenuation, permit);
      if (!mutationOk) t.log({ specimen, permit, mutatedAttenuation });
      t.true(mutationOk, 'mutation must visit all attenuations');

      let replacementCallCount = 0;
      const replacedAttenuation = attenuate(specimen, permit, _obj => {
        replacementCallCount += 1;
        return /** @type {any} */ ({ [tag]: replacementCallCount });
      });
      t.is(mutationCallCount, replacementCallCount);
      if (mutationCallCount > 0) {
        const replacementKeys = ownKeys(replacedAttenuation);
        t.true(replacementKeys.includes(tag));
        t.is(replacementKeys.length, 1);
        t.is(replacedAttenuation[tag], replacementCallCount);
      }
    },
  );

  testProp(
    'attenuate - bad permit',
    /** @type {any} */ ([arbBadPermit]),
    // @ts-expect-error TS2345 function signature
    async (t, { specimen, permit, problem: _problem }) => {
      // t.log({ specimen, permit, problem });
      t.throws(() => attenuate(specimen, permit), {
        message: /^invalid permit\b/,
      });
    },
  );

  testProp(
    'attenuate - bad specimen',
    /** @type {any} */ ([arbBadSpecimen]),
    // @ts-expect-error TS2345 function signature
    async (t, { specimen, permit, problem: _problem }) => {
      // t.log({ specimen, permit, problem });
      t.throws(() => attenuate(specimen, permit), {
        message: /^specimen( at path .*)? must be an object for permit\b/,
      });
    },
  );

  testProp(
    'attenuate - specimen missing key',
    /** @type {any} */ ([arbSpecimenMissingKey]),
    // @ts-expect-error TS2345 function signature
    async (t, { specimen, permit, problem: _problem }) => {
      // t.log({ specimen, permit, problem });
      t.throws(() => attenuate(specimen, permit), {
        message: /^specimen is missing path /,
      });
    },
  );
}
// #endregion

test('deeplyFulfilledObject', async t => {
  const someFar = Far('somefar', { getAsync: () => Promise.resolve('async') });
  const unfulfilled = harden({
    obj1: {
      obj2a: {
        stringP: Promise.resolve('foo'),
      },
      obj2b: someFar,
    },
  });
  const fulfilled = await deeplyFulfilledObject(unfulfilled);
  // JS check that it's a now string
  fulfilled.obj1.obj2a.stringP.length;
  t.deepEqual(fulfilled, {
    obj1: { obj2a: { stringP: 'foo' }, obj2b: someFar },
  });
});

// #region deepMapObject
/**
 * @typedef {object} DeepMapObjectTestParams
 * @property {any} input
 * @property {[any, any][]} replacements
 * @property {string[][]} unchangedPaths
 * @property {any} [expectedOutput]
 */

/** @type {import('ava').Macro<[DeepMapObjectTestParams]>} */
const deepMapObjectTest = test.macro({
  title(providedTitle, { input }) {
    return `deepMapObject - ${providedTitle || JSON.stringify(input)}`;
  },
  exec(t, { input, replacements, unchangedPaths, expectedOutput }) {
    const replacementMap = new Map(replacements);
    const output = deepMapObject(input, val =>
      replacementMap.has(val) ? replacementMap.get(val) : val,
    );

    for (const unchangedPath of unchangedPaths) {
      /** @type {any} */
      let inputVal = input;
      /** @type {any} */
      let outputVal = output;
      for (const pathPart of unchangedPath) {
        inputVal = inputVal[pathPart];
        outputVal = outputVal[pathPart];
      }
      t.is(
        outputVal,
        inputVal,
        `${['obj', ...unchangedPath].join('.')} is unchanged`,
      );
    }

    if (expectedOutput) {
      t.deepEqual(output, expectedOutput);
    }
  },
});

test('identity', deepMapObjectTest, {
  input: { foo: 42 },
  replacements: [],
  unchangedPaths: [[]],
});
test('non object', deepMapObjectTest, {
  input: 'not an object',
  replacements: [['not an object', 'not replaced']],
  unchangedPaths: [[]],
  expectedOutput: 'not an object',
});
test('one level deep', deepMapObjectTest, {
  input: { replace: 'replace me', notChanged: {} },
  replacements: [['replace me', 'replaced']],
  unchangedPaths: [['notChanged']],
  expectedOutput: { replace: 'replaced', notChanged: {} },
});

const testRecord = { maybeReplace: 'replace me' };
test('replace first before deep map', deepMapObjectTest, {
  input: { replace: testRecord, notChanged: {} },
  replacements: [
    [testRecord, { different: 'something new' }],
    ['replace me', 'should not be replaced'],
  ],
  unchangedPaths: [['notChanged']],
  expectedOutput: { replace: { different: 'something new' }, notChanged: {} },
});

test('not mapping top level container', deepMapObjectTest, {
  input: testRecord,
  replacements: [
    [testRecord, { different: 'should not be different' }],
    ['replace me', 'replaced'],
  ],
  unchangedPaths: [],
  expectedOutput: { maybeReplace: 'replaced' },
});
test('deep mapping', deepMapObjectTest, {
  input: {
    one: { two: { three: 'replace me' }, notChanged: {} },
    another: 'replace me',
  },
  replacements: [['replace me', 'replaced']],
  unchangedPaths: [['one', 'notChanged']],
  expectedOutput: {
    one: { two: { three: 'replaced' }, notChanged: {} },
    another: 'replaced',
  },
});
// #endregion

test('makeMeasureSeconds', async t => {
  const times = [1000.25, 2000.75, NaN];
  /** @type {() => number} */
  // @ts-expect-error undefined on fourth call
  const mockNow = () => times.shift();
  const measureSeconds = makeMeasureSeconds(mockNow);

  const unique = Symbol('unique');
  const output = await measureSeconds(async () => unique);
  t.deepEqual(output, { result: unique, duration: 1.0005 });
  t.deepEqual(times, [NaN]);
});

test('assertAllDefined', t => {
  /** @type {{ s: string; m: string | undefined; u?: string }} */
  const obj = { s: 'defined', m: 'maybe' };
  assertAllDefined(obj);
  // typecheck
  obj.m.length;
  t.throws(
    () =>
      // @ts-expect-error key presence not checked
      obj.u.length,
  );

  t.throws(() => assertAllDefined({ u: undefined, v: undefined }), {
    message: 'missing ["u","v"]',
  });

  /** @type {{ prop?: number }} */
  const foo = {};
  assertAllDefined(foo);
  t.throws(
    () =>
      // @ts-expect-error key presence not checked
      foo.prop.toFixed,
  );
});

test('whileTrue', async t => {
  const elems = [1, 2, 3];
  /** @type {any} */
  let cur;
  let count = 0;
  for await (const produced of whileTrue(() => {
    cur = elems.shift();
    count += 1;
    return count % 2 === 0 ? cur : Promise.resolve(cur);
  })) {
    t.is(produced, cur, 'cur is produced');
    t.not(produced, undefined, 'produced is not undefined');
  }
  t.is(cur, undefined, 'cur is done');
  t.is(count, 4, 'count is expected');
});

test('untilTrue', async t => {
  const elems = [0, false, null, NaN, '', 'truey', 1.39];
  /** @type {any} */
  let cur;
  let count = 0;
  for await (const produced of untilTrue(() => {
    cur = elems.shift();
    count += 1;
    return count % 2 === 0 ? cur : Promise.resolve(cur);
  })) {
    t.is(produced, cur, 'cur is produced');
    t.assert(!produced, 'produced is falsy');
  }
  t.is(cur, 'truey', 'cur is done');
  t.is(count, 6, 'count is expected');
});

test('forever', async t => {
  let count = 0;
  for await (const produced of forever) {
    t.is(produced, undefined, 'produced is undefined');
    count += 1;
    if (count > 3) {
      break;
    }
  }
  t.is(count, 4, 'count is expected');
});

// #region synchronizedTee
/**
 * @template T
 * @param {AsyncIterable<T>} stream
 * @param {T[]} output
 * @param {number} [maxItems]
 */
const consumeStreamInto = async (stream, output, maxItems) => {
  for await (const item of stream) {
    output.push(item);
    if (output.length === maxItems) break;
  }
};

/**
 * @template T
 * @param {Iterable<T> | AsyncIterable<T>} items
 */
const generateStream = async function* generateStream(items) {
  yield* items;
};
harden(generateStream);

test('synchronizedTee - consumeAll - 1 reader', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output = /** @type {number[]} */ ([]);
  const [reader] = synchronizedTee(source, 1);
  await consumeStreamInto(reader, output);
  t.deepEqual(output, sourceData);
});

test('synchronizedTee - consumeAll - 2 readers', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1),
    consumeStreamInto(reader2, output2),
  ]);

  t.deepEqual(output1, sourceData);
  t.deepEqual(output2, sourceData);
});

test('synchronizedTee - break early', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1, 2),
    consumeStreamInto(reader2, output2),
  ]);

  t.deepEqual(output1, sourceData.slice(0, 2));
  t.deepEqual(output2, sourceData.slice(0, 2));
});

test('synchronizedTee - throw', async t => {
  const sourceData = [1, 2, 3];
  const source = generateStream(sourceData);
  const output1 = /** @type {number[]} */ ([]);
  const [reader1, reader2] = synchronizedTee(source, 2);
  const rejection = { message: 'Interrupted' };
  const result1 = consumeStreamInto(reader1, output1);
  const result2 = reader2.throw(Error(rejection.message));

  await t.throwsAsync(result1, { message: 'Teed stream threw' });
  await t.throwsAsync(result2, rejection);
});

test('synchronizedTee - consume synchronized', async t => {
  const sourceData = [1, 2, 3];
  const output1 = /** @type {number[]} */ ([]);
  const output2 = /** @type {number[]} */ ([]);
  let i = 0;
  async function* generate() {
    while (i < sourceData.length) {
      try {
        yield sourceData[i];
      } finally {
        i += 1;
        t.deepEqual(output1, sourceData.slice(0, i));
        t.deepEqual(output2, sourceData.slice(0, i));
      }
    }
  }
  harden(generate);
  const source = generate();
  const [reader1, reader2] = synchronizedTee(source, 2);
  await Promise.all([
    consumeStreamInto(reader1, output1),
    consumeStreamInto(reader2, output2, 2),
  ]);

  t.is(i, 2);
  t.deepEqual(output1, sourceData.slice(0, i));
  t.deepEqual(output2, sourceData.slice(0, i));
});
// #endregion
