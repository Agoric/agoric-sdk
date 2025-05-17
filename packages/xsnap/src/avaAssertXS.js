/* global globalThis */
/** global print */

const { assign, freeze, keys } = Object;

/**
 * deep equal value comparison
 * XXX broken https://github.com/Agoric/agoric-sdk/pull/5398
 *
 * originally based on code from Paul Roub Aug 2014
 * https://stackoverflow.com/a/25456134/7963
 *
 * @type {(x: unknown, y: unknown) => Delta }
 * @typedef { null | { actual: unknown, expected?: unknown }} Delta
 */
function deepDifference(x, y) {
  if (Object.is(x, y)) {
    return null;
  }
  if (
    typeof x === 'object' &&
    x != null &&
    typeof y === 'object' &&
    y != null
  ) {
    if (keys(x).length !== keys(y).length) {
      return {
        actual: {
          length: keys(x).length,
          keys: keys(x),
        },
        expected: {
          length: keys(y).length,
          keys: keys(y),
        },
      };
    }

    const { hasOwnProperty } = Object.prototype;
    /** @type {(obj: object, prop: string | symbol | number) => boolean} */
    const hasOwnPropertyOf = (obj, prop) =>
      Reflect.apply(hasOwnProperty, obj, [prop]);
    for (const prop of Reflect.ownKeys(x)) {
      if (hasOwnPropertyOf(y, prop)) {
        if (!deepDifference(x[prop], y[prop])) {
          return null;
        }
      } else {
        return { actual: { extraProperty: prop } };
      }
    }

    return null;
  }
  return {
    actual: { type: typeof x, value: x },
    expected: { type: typeof y, value: y },
  };
}

/**
 * Test status reporting inspired by Test Anything Protocol (TAP)
 *
 * ref https://testanything.org/tap-specification.html
 *
 * @param {(msg: TapMessage) => void} send
 *
 * @typedef { ReturnType<typeof tapFormat> } TapFormat
 * @import {TapMessage} from './avaXS.js'
 */
function tapFormat(send) {
  return freeze({
    /** @type {(qty: number) => void} */
    plan(qty) {
      send({ plan: qty });
    },
    /** @type {(testNum: number, txt?: string) => void} */
    ok(testNum, txt) {
      send({ status: 'ok', id: testNum, message: txt });
    },
    /** @type {(testNum: number, txt: string) => void} */
    skip(testNum, txt) {
      send({ status: 'SKIP', id: testNum, message: txt });
    },
    /** @type {(testNum: number, txt?: string) => void} */
    notOk(testNum, txt) {
      send({ status: 'not ok', id: testNum, message: txt });
    },
    /** @type {(txt: string, label?: string) => void} */
    diagnostic(txt, label) {
      send({ note: txt, label });
    },
  });
}

/** @type { Harness | null } */
let theHarness = null; // ISSUE: ambient

/**
 * @param {(msg: TapMessage) => void} send
 *
 * @typedef { ReturnType<typeof createHarness>} Harness
 */
function createHarness(send) {
  let testNum = 0;
  /** @type {((ot: { context: object }) => Promise<void>)[]} */
  const beforeHooks = [];
  /** @type {Record<string, () => Promise<void>>} */
  const suitesToRun = {};
  const context = {};

  const it = freeze({
    send,
    get context() {
      return context;
    },
    /** @type {(label: string, hook: () => Promise<void>) => void } */
    before(_label, hook) {
      beforeHooks.push(hook);
    },
    /** @type { (ok: boolean) => number } */
    finish(_ok) {
      testNum += 1;
      return testNum;
    },
    /** @type { (name: string, thunk: () => Promise<void>) => void } */
    queue(name, thunk) {
      if (name in suitesToRun) {
        throw Error(`duplicate name ${name}`);
      }
      suitesToRun[name] = thunk;
    },
    testNames() {
      return keys(suitesToRun);
    },
    /**
     * @param {string} name
     * @returns {Promise<void>}
     */
    async run(name) {
      for await (const hook of beforeHooks) {
        await hook({ context });
      }

      const suite = suitesToRun[name];
      await suite();
    },
  });

  if (!theHarness) {
    theHarness = it;
  }
  return it;
}

/**
 * @param {*} exc
 * @param {Expectation} expectation
 * @returns {null | { expected: unknown, actual: unknown }}
 * @typedef {{ instanceOf: Function } | { message: string | RegExp } | undefined} Expectation
 */
function checkExpectation(exc, expectation) {
  if (!expectation) return null;
  if ('instanceOf' in expectation) {
    if (exc instanceof expectation.instanceOf) {
      return null;
    } else {
      return { expected: expectation.instanceOf, actual: exc };
    }
  }
  if ('message' in expectation) {
    const { message } = expectation;
    const ok =
      typeof message === 'string'
        ? message === exc.message
        : message.test(exc.message);
    if (ok) {
      return null;
    } else {
      return { actual: exc.message, expected: message };
    }
  }
  throw Error(`not implemented: ${JSON.stringify(expectation)}`);
}

/**
 * Emulate ava assertion API
 *
 * ref https://github.com/avajs/ava/blob/HEAD/docs/03-assertions.md
 *
 * @param {Harness} htest
 * @param {TapFormat} out
 *
 * @typedef {ReturnType<typeof makeTester>} Tester
 */
function makeTester(htest, out) {
  /** @type {(result: boolean, info?: string) => void} */
  function assert(result, info) {
    const testNum = htest.finish(result);
    if (result) {
      out.ok(testNum, info);
    } else {
      out.notOk(testNum, info);
    }
  }

  /**
   * @param {unknown} value
   * @param {string} msg
   */
  function truthy(value, msg = 'should be truthy') {
    assert(!!value, msg);
  }

  const t = freeze({
    /** @param {number} count */
    plan(count) {
      out.plan(count);
    },
    get context() {
      return htest.context;
    },
    /** @param {string} message */
    pass(message) {
      assert(true, message);
    },
    /** @param {string} message */
    fail(message) {
      assert(false, message);
    },
    // Not the SES or @endo/errors `assert`
    // See https://github.com/Agoric/agoric-sdk/issues/9515
    assert,
    truthy,
    /**
     * @param {unknown} value
     * @param {string} message
     */
    falsy(value, message = 'should be falsy') {
      assert(!value, message);
    },
    /**
     * @param {unknown} value
     * @param {string} message
     */
    true(value, message = 'should be true') {
      assert(value === true, message);
    },
    /**
     * @param {unknown} value
     * @param {string} message
     */
    false(value, message = 'should be false') {
      assert(value === false, message);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    is(a, b, message = 'should be identical') {
      assert(Object.is(a, b), message);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    not(a, b, message = 'should not be identical') {
      assert(!Object.is(a, b), message);
    },
    /** @type {(actual: unknown, expected: unknown, message?: string) => void } */
    deepEqual(actual, expected, message = 'should be deep equal') {
      const delta = deepDifference(actual, expected);
      assert(delta === null, `${message}: ${JSON.stringify(delta)}`);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    notDeepEqual(a, b, message = 'should not be deep equal') {
      const delta = deepDifference(a, b);
      assert(delta !== null, `${message}: ${JSON.stringify(delta)}`);
    },
    /** @type {(a: unknown, b: unknown, message?: string) => void} */
    like(_a, _b, _message = 'should be like') {
      throw Error('not implemented');
    },
    /** @type {(fn: () => unknown, e?: Expectation, message?: string) => void } */
    throws(fn, expectation, message = `should throw like ${expectation}`) {
      try {
        fn();
        assert(false, message);
      } catch (ex) {
        const delta = checkExpectation(ex, expectation);
        assert(!delta, `${message}: ${JSON.stringify(delta)}`);
      }
    },
    /** @type {(fn: () => unknown, message?: string) => void } */
    notThrows(fn, message) {
      try {
        fn();
      } catch (ex) {
        assert(false, message);
        return;
      }
      assert(true, message);
    },
    /** @type {(thrower: () => Promise<unknown>, expectation?: Expectation, message?: string) => Promise<void> } */
    async throwsAsync(
      thrower,
      expectation,
      message = `should reject like ${expectation}`,
    ) {
      await null;
      try {
        await (typeof thrower === 'function' ? thrower() : thrower);
        assert(false, message);
      } catch (ex) {
        const delta = checkExpectation(ex, expectation);
        assert(!delta, `${message}: ${JSON.stringify(delta)}`);
      }
    },
    /** @type {(thrower: () => Promise<unknown>, message?: string) => Promise<void> } */
    async notThrowsAsync(nonThrower, message) {
      await null;
      try {
        await (typeof nonThrower === 'function' ? nonThrower() : nonThrower);
      } catch (ex) {
        assert(false, message);
        return;
      }
      assert(true, message);
    },
  });

  return t;
}

/**
 * @param {string} label
 * @param {(t: Tester) => Promise<void>} run
 * @param {Harness?} htestOpt
 */
const test = (label, run, htestOpt) => {
  const htest = htestOpt || theHarness;
  if (!htest) throw Error('no harness');

  htest.queue(label, async () => {
    const out = tapFormat(htest.send);
    const t = makeTester(htest, out);
    await null;
    try {
      // out.diagnostic('start', label);
      await run(t);
      // out.diagnostic('end', label);
    } catch (ex) {
      console.log('FAIL (todo route console)', ex);
      t.fail(`${label} threw: ${ex.message}`);
    }
  });
};

test.createHarness = createHarness;

// TODO: test.skip, test.failing

test.todo = _title => {};
test.failing = (_title, _implementation) => {};

/** @type {(label: string, fn: () => Promise<void>) => void } */
test.before = (label, fn) => {
  if (typeof label === 'function') {
    fn = label;
    label = '';
  }
  if (!theHarness) throw Error('no harness');
  theHarness.before(label, fn);
};

freeze(test);

// export default test;
// export { test };
assign(globalThis, { test });
