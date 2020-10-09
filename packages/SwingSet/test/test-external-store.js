// @ts-check
/* eslint-disable no-use-before-define */
import '@agoric/install-ses';
import test from 'ava';
import makeStore from '@agoric/store';

const moduleLevel = 'module-level';

const runTests = (t, mf) => {
  const h = mf('Hello');
  t.deepEqual(h.getCount(), { invocationCount: 26, moduleLevel });
  t.is(h.hello('World'), `Hello, World!`);
  t.deepEqual(h.getCount(), { invocationCount: 27, moduleLevel });
  t.is(h.hello('second'), `Hello, second!`);
  t.deepEqual(h.getCount(), { invocationCount: 28, moduleLevel });
  return h;
};

test('original sources', t => {
  // This is the original source code.
  const { make: makeFoo } = makeCollection((msg = 'Hello') => {
    let startCount = 24;
    startCount += 1;
    let invocationCount = startCount;
    const obj = {
      hello(nick) {
        invocationCount += 1;
        return `${msg}, ${nick}!`;
      },
      getCount() {
        return { moduleLevel, invocationCount };
      },
    };
    obj.hello('init');
    return obj;
  });

  runTests(t, makeFoo);
});

test('rewritten code', t => {
  /**
   * This is the rewritten source code, line numbers can be preserved.
   *
   * The return value drives the analysis of which expressions need to be
   * evaluated to resurrect the object.  Those expressions determine which
   * variables need to be captured by $hdata to write to and read from the store.
   *
   * Side-effecting expressions are rewritten to be conditional on whether the
   * initialisation step is taking place.  This is done on a per-expression
   * basis, since it is known any variables that are changed by the side-effect
   * are either already captured by $hdata, or aren't needed by the return
   * value.
   *
   * Declarations are not considered side-effects.
   */
  const store = makeSwingSetCollection(
    (msg = 'Hello') => ({ msg }),
    $hinit => $hdata => {
      let startCount = $hinit && 24;
      $hinit && (startCount += 1);
      $hinit && ($hdata.invocationCount = startCount);
      const obj = {
        hello(nick) {
          $hdata.invocationCount += 1;
          return `${$hdata.msg}, ${nick}!`;
        },
        getCount() {
          return { moduleLevel, invocationCount: $hdata.invocationCount };
        },
      };
      $hinit && obj.hello('init');
      return obj;
    },
  );

  const h = runTests(t, store.make);
  const key = store.getKey(h);
  t.is(key, '1');
  const h2 = store.load(key);

  // We get a different representative, which shares the key.
  t.not(h2, h);
  t.is(store.getKey(h2), `1`);

  // The methods are there now, too.
  const last = h.getCount();
  t.deepEqual(h2.getCount(), last);
  h2.hello('restored');

  // Note that the explicitly-loaded object state evolves independently.
  const next = h2.getCount();
  t.deepEqual(next, {
    ...last,
    invocationCount: last.invocationCount + 1,
  });
  t.deepEqual(h.getCount(), last);
});

/** The rest of this file is some implementation. */

/**
 * @typedef {(...args: any[]) => Record<string, any>} AdaptArguments
 * @typedef {(data: Record<string, any>) => any} Hydrate
 * @typedef {(init: boolean) => Hydrate} MakeHydrate when init is falsy, prevent
 */

/**
 * @typedef {Object} StringStore
 * @property {(key: string, value: string) => void} set
 * @property {(key: string, value: string) => void} init
 * @property {(key: string) => string} get
 *
 * @typedef {Object} Collection
 * @property {(...args: Array<any>) => any} make
 * @property {(value: any) => string} getKey
 * @property {(key: string) => any} load
 */

/**
 * @param {(...args: Array<any>) => any} maker
 * @returns {Collection}
 */
const makeCollection = maker => {
  // The default store has no query ability.
  return harden({
    make(...args) {
      return maker(...args);
    },
    load(_key) {
      throw Error('unimplemented');
    },
    getKey(_obj) {
      throw Error('unimplemented');
    },
  });
};

/**
 * @param {AdaptArguments} adaptArguments
 * @param {MakeHydrate} makeHydrate
 * @returns {Collection}
 */
function makeSwingSetCollection(adaptArguments, makeHydrate) {
  const serialize = JSON.stringify;
  const unserialize = JSON.parse;

  /** @type {WeakMap<any, string>} */
  const valueToKey = new WeakMap();
  let lastEntryKey = 0;
  /** @type {import('@agoric/store').Store<string, string>} */
  const store = makeStore('entryKey');

  /**
   * Create a data object that queues writes to the store.
   *
   * @param {string} key
   * @param {Record<any, string>} data
   */
  const makeActiveData = (key, data) => {
    const write = () => store.set(key, serialize(data));
    const activeData = {};
    for (const prop of Object.getOwnPropertyNames(data)) {
      Object.defineProperty(activeData, prop, {
        get: () => data[prop],
        set: value => {
          data[prop] = value;
          write();
        },
      });
    }
    return harden(activeData);
  };

  const initHydrate = makeHydrate(true);
  const hydrate = makeHydrate(false);
  const estore = {
    make(...args) {
      const data = adaptArguments(...args);
      // Create a new object with the above guts.
      lastEntryKey += 1;
      const key = `${lastEntryKey}`;
      initHydrate(data);

      // We store and reload it to sanity-check the initial state and also to
      // ensure that the new object has active data.
      store.init(key, serialize(data));
      return estore.load(key);
    },
    getKey(value) {
      return valueToKey.get(value);
    },
    load(key) {
      // FIXME: Maybe try to handle returning a single identity.
      const data = unserialize(store.get(key));
      const activeData = makeActiveData(key, data);
      const obj = hydrate(activeData);
      valueToKey.set(obj, key);
      return obj;
    },
  };
  return estore;
}
