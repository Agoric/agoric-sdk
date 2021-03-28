// @ts-check
/* eslint-disable no-use-before-define */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import {
  makeStore,
  makeExternalStore,
  makeHydrateExternalStoreMaker,
  makeWeakStore,
} from '../src/index';

import '../src/types';

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
  const { makeInstance: makeFoo } = makeExternalStore(
    'foo instance',
    (msg = 'Hello') => {
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
    },
  );

  runTests(t, makeFoo);
});

test('rewritten code', t => {
  /** @type {HydrateHook} */
  let vatHydrateHook;
  const makeVatExternalStore = makeHydrateExternalStoreMaker(hydrateHook => {
    vatHydrateHook = hydrateHook;
    /** @type {Store<number, HydrateStore>} */
    const idToStore = makeStore('storeId');
    return {
      getHydrateStore(storeId) {
        return idToStore.get(storeId);
      },
      makeHydrateStore(storeId, instanceKind) {
        // This implementation is totally leaky.
        const store = makeStore(`${instanceKind} ids`);

        // We use JSON here just as a minimal test.  Real implementations will
        // want something like @agoric/marshal.
        /** @type {HydrateStore} */
        const hstore = {
          init(id, data) {
            store.init(id, JSON.stringify(data));
          },
          get(id) {
            return JSON.parse(store.get(id));
          },
          set(id, data) {
            store.set(id, JSON.stringify(data));
          },
          makeWeakStore() {
            return makeWeakStore(instanceKind);
          },
        };
        harden(hstore);
        idToStore.init(storeId, hstore);
        return hstore;
      },
    };
  });

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
  const store = makeVatExternalStore(
    'Hello instance',
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

  const h = runTests(t, store.makeInstance);
  const key = vatHydrateHook.getKey(h);
  t.deepEqual(key, [1, 1]);
  const h2 = vatHydrateHook.load(key);

  // We get a different representative, which shares the key.
  t.not(h2, h);
  t.deepEqual(vatHydrateHook.getKey(h2), [1, 1]);

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
