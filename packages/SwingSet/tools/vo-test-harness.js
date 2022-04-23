// eslint-disable-next-line import/order
import { test } from './prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { assert } from '@agoric/assert';
import { Far, makeMarshal } from '@endo/marshal';
import { provideHostStorage } from '../src/controller/hostStorage.js';
import { initializeSwingset, makeSwingsetController } from '../src/index.js';
import { setupTestLiveslots } from '../test/liveslots-helpers.js';
import { capargs } from '../test/util.js';

export { test };

export async function runVOTest(t, prepare, makeTestObject, testTestObject) {
  function buildRootObject(vatPowers) {
    const { VatData } = vatPowers;
    const { defineKind } = VatData;

    const freeChecker = new WeakSet();

    const makeSlug = defineKind('slug', label => ({ label }), {
      getLabel: ({ state }) => state.label,
    });
    const cacheDisplacer = makeSlug('cacheDisplacer');

    const makeHolder = defineKind('holder', (held = null) => ({ held }), {
      setValue: ({ state }, value) => {
        state.held = value;
      },
      getValue: ({ state }) => state.held,
    });
    const holder = makeHolder();

    let held = null;

    prepare(VatData);

    function displaceCache() {
      return cacheDisplacer.getLabel();
    }

    return Far('root', {
      makeAndHold() {
        held = makeTestObject();
        freeChecker.add(held);
        displaceCache();
      },
      storeHeld() {
        holder.setValue(held);
        displaceCache();
      },
      dropHeld() {
        held = null;
        displaceCache();
      },
      fetchAndHold() {
        held = holder.getValue();
        t.falsy(
          freeChecker.has(held),
          'somebody continues to hold test object',
        );
        displaceCache();
      },
      testHeld(phase) {
        testTestObject(held, phase);
      },
    });
  }

  const { dispatchMessage } = await setupTestLiveslots(
    t,
    buildRootObject,
    'bob',
    true,
    true,
  );

  await dispatchMessage('makeAndHold');
  await dispatchMessage('testHeld', capargs(['before']));
  await dispatchMessage('storeHeld');
  await dispatchMessage('dropHeld');
  await dispatchMessage('fetchAndHold');
  await dispatchMessage('testHeld', capargs(['after']));
}

function bfile(name) {
  return new URL(name, import.meta.url).pathname;
}

const stupidM = makeMarshal(
  () => undefined,
  slot => `@${slot}`,
);
const extractLog = capdata => stupidM.unserialize(capdata);

export async function runDVOTest(t, logCheck, testVatSource, testParams) {
  const config = {
    includeDevDependencies: true,
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: { sourceSpec: bfile('bootstrap-dvo-test.js') },
    },
    bundles: {
      testVat: { sourceSpec: testVatSource },
    },
  };

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [], hostStorage);
  const c = await makeSwingsetController(hostStorage);
  c.pinVatRoot('bootstrap');
  await c.run();

  async function run(name, args = []) {
    assert(Array.isArray(args));
    const kpid = c.queueToVatRoot('bootstrap', name, capargs(args));
    await c.run();
    const status = c.kpStatus(kpid);
    const capdata = c.kpResolution(kpid);
    return [status, capdata];
  }

  // create initial version
  const [v1status, v1capdata] = await run('buildV1', [testParams]);
  t.is(v1status, 'fulfilled');
  logCheck(t, 'before', extractLog(v1capdata));

  // now perform the upgrade
  const [v2status, v2capdata] = await run('upgradeV2', [testParams]);
  t.is(v2status, 'fulfilled');
  logCheck(t, 'after', extractLog(v2capdata));
}
