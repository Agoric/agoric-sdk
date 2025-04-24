import type { TestFn } from 'ava';
import anyTest from 'ava';

import fs from 'node:fs';
import { createRequire } from 'node:module';
import pathlib from 'node:path';

import tmp from 'tmp';

import { q, Fail } from '@endo/errors';

import {
  BridgeId,
  VBankAccount,
  deepCopyJsonable,
  makeTempDirFactory,
  objectMap,
} from '@agoric/internal';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { provideBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';

import type { SwingStore } from '@agoric/swing-store';
import {
  makeHelpers,
  makeSwingStoreOverlay,
  type Helpers,
} from '../tools/inquisitor.mjs';
import { makeCosmicSwingsetTestKit } from '../tools/test-kit.js';

const resolveToPath = createRequire(import.meta.url).resolve;

const tmpDir = makeTempDirFactory(tmp);

const test = anyTest as TestFn;

/**
 * Converts a Record<name, specifierString> into Record<name, { sourceSpec }>
 * for defining e.g. a `bundles` group.
 */
const makeSourceDescriptors = (
  src: Record<string, string>,
): SwingSetConfigDescriptor => {
  const hardened = objectMap(src, sourceSpec => ({ sourceSpec }));
  return deepCopyJsonable(hardened);
};

test('makeHelpers', async t => {
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPortName: string, msg: any) => {
    switch (destPortName) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      case BridgeId.BANK: {
        if (msg.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
          const matchesRequest = (desc: { module: string }) =>
            desc.module === msg.moduleName;
          const found = Object.values(VBankAccount).find(matchesRequest);
          if (found) return found.address;
          return { error: `module account ${q(msg.moduleName)} not found` };
        }
        break;
      }
      default:
        break;
    }
    Fail`port ${q(destPortName)} not implemented for message ${msg}`;
  };
  const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend);
  const { pushCoreEval, runNextBlock, swingStore, shutdown } = testKit;
  t.teardown(shutdown);

  // To tickle some activity, run a couple of trivial blocks.
  pushCoreEval(`${() => {}}`);
  await runNextBlock();
  pushCoreEval(`${() => {}}`);
  await runNextBlock();

  // Build and exercise the helpers.
  const { db } = swingStore.internal;
  // TODO: Provide a real EV object if needed for more complex tests
  const EV =
    fn =>
    (...args) =>
      fn(...args);
  const { stable: helpers } = makeHelpers({ db, EV });
  t.truthy(helpers.kvGet('vat.names'));
  t.true(Array.isArray(helpers.kvGetJSON('vat.dynamicIDs')));
  const vatAdmin: any = helpers.vatsByName.get('vatAdmin');
  t.like(vatAdmin, { name: 'vatAdmin', isStatic: true }, 'vatAdmin');
  {
    const { vatID } = vatAdmin;
    t.regex(vatID, /^v[1-9][0-9]*$/, 'vatAdmin vatID');

    const rootVref = 'o+0';
    const rootRefs = helpers.getRefs(rootVref, vatID);
    t.true(rootRefs.length > 0, 'vatAdmin root object export');

    const rootKref = rootRefs[0].kref;
    const rootRefsByKref = helpers.getRefs(rootKref);
    t.deepEqual(rootRefsByKref, rootRefs, 'vatAdmin root object kref');

    const clist: any = helpers.kvGlob(`${vatID}.c.*`);
    t.true(clist.length > 0);
    const rootRow = clist.find(row => row.value === rootKref);
    t.like(
      rootRow,
      { key: `${vatID}.c.${rootVref}`, value: rootKref },
      'kvGlob',
    );
  }
});

// This is really a test of makeCosmicSwingsetTestKit, but inquisitor relies
// upon that so we include it here.
test('vat lifecycle', async t => {
  let swingStore: SwingStore | undefined;
  let shutdown:
    | ((options?: { kernelOnly?: boolean }) => Promise<void>)
    | undefined;
  t.teardown(() => shutdown?.());
  const fakeStorageKit = makeFakeStorageKit('');
  const { toStorage: handleVstorage } = fakeStorageKit;
  const receiveBridgeSend = (destPortName: string, msg: any) => {
    switch (destPortName) {
      case BridgeId.STORAGE: {
        return handleVstorage(msg);
      }
      case BridgeId.BANK: {
        if (msg.type === 'VBANK_GET_MODULE_ACCOUNT_ADDRESS') {
          const matchesRequest = (desc: { module: string }) =>
            desc.module === msg.moduleName;
          const found = Object.values(VBankAccount).find(matchesRequest);
          if (found) return found.address;
          return { error: `module account ${q(msg.moduleName)} not found` };
        }
        break;
      }
      default:
        break;
    }
    Fail`port ${q(destPortName)} not implemented for message ${msg}`;
  };

  // Launch the swingset and make a vat with some state.
  {
    const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, {
      bundles: makeSourceDescriptors({
        puppet: '@agoric/swingset-vat/tools/vat-puppet.js',
      }),
    });
    const { EV } = testKit;
    ({ swingStore, shutdown } = testKit);

    const puppet = await EV.vat('bootstrap').createVat('puppet');
    t.is(await EV(puppet).getVersion(), 1);
    const held = await EV.vat('bootstrap').makeRemotable('held', { data: 42 });
    t.deepEqual(
      [await EV(puppet).holdInHeap(held), await EV(puppet).holdInHeap(held)],
      [1, 2],
      'vat must holdInHeap',
    );
    await EV(puppet).baggageSet('imported', held);
    const got = await EV(puppet).baggageGet('imported');
    t.is(await EV(got).data(), 42, 'vat must hold in baggage');

    await shutdown({ kernelOnly: true });
  }

  // Restart the swingset with an overlay swing-store and verify state
  // preservation, then upgrade the vat to a previously-unknown bundle, then
  // discard the overlay and do it all again.
  const {
    name: tmpName,
    fd,
    removeCallback,
  } = tmp.fileSync({ detachDescriptor: true });
  t.teardown(() => removeCallback());
  fs.writeSync(fd, swingStore.debug.serialize());
  const bundleDir = pathlib.resolve('bundles');
  const bundleCache = await provideBundleCache(bundleDir, {}, s => import(s));
  const bundle = await bundleCache.load(
    resolveToPath('@agoric/swingset-vat/tools/vat-puppet-v2.js'),
  );
  const bundleID = `b1-${bundle.endoZipBase64Sha512}`;
  for (const label of ['first overlay', 'second overlay']) {
    t.log(label);
    const { swingStore: overlay } = makeSwingStoreOverlay(tmpName);
    const testKit = await makeCosmicSwingsetTestKit(receiveBridgeSend, {
      swingStore: overlay,
    });
    const { EV } = testKit;
    ({ shutdown } = testKit);

    const puppet = await EV.vat('bootstrap').getVatRoot('puppet');
    t.is(await EV(puppet).getVersion(), 1, `${label} starting vat version`);
    const held = await EV(puppet).baggageGet('imported');
    t.is(
      await EV(held).data(),
      42,
      `${label} swingset restart must preserve vat baggage`,
    );
    t.deepEqual(
      [await EV(puppet).holdInHeap(held), await EV(puppet).holdInHeap(held)],
      [3, 4],
      `${label} swingset restart must preserve vat heap`,
    );

    await overlay.kernelStorage.bundleStore.addBundle(bundleID, bundle);
    t.is(
      await EV.vat('bootstrap').upgradeVat('puppet', bundleID),
      1,
      `${label} upgrade incarnation (0-indexed)`,
    );
    const puppetV2 = await EV.vat('bootstrap').getVatRoot('puppet');
    t.is(
      await EV(puppetV2).getVersion(),
      2,
      `${label} vat upgrade code version`,
    );
    const got = await EV(puppet).baggageGet('imported');
    t.is(
      await EV(got).data(),
      42,
      `${label} upgraded vat must inherit baggage`,
    );
    t.deepEqual(
      [await EV(puppet).holdInHeap(got), await EV(puppet).holdInHeap(got)],
      [1, 2],
      `${label} upgraded vat must have fresh heap`,
    );

    await shutdown({ kernelOnly: true });
    shutdown = undefined;
  }
});
