/* global setTimeout */
// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
import { spawn } from 'child_process';
import bundleSource from '@endo/bundle-source';
import { initSwingStore } from '@agoric/swing-store';

import { makeXsSubprocessFactory } from '../src/kernel/vat-loader/manager-subprocess-xsnap.js';
import {
  makeWorkerBundleHandler,
  makeXsnapBundleData,
} from '../src/controller/bundle-handler.js';
import { makeStartXSnap } from '../src/controller/startXSnap.js';
import { kser } from '../src/lib/kmarshal.js';

test('child termination distinguished from meter exhaustion', async t => {
  /** @type { ReturnType<typeof spawn> } */
  let theProc;
  const { kernelStorage } = initSwingStore();
  const { bundleStore } = kernelStorage;
  const bundleData = makeXsnapBundleData();
  const bundleHandler = makeWorkerBundleHandler(bundleStore, bundleData);
  const bundleIDs = await bundleHandler.getCurrentBundleIDs();

  const startXSnap = makeStartXSnap({
    bundleHandler,
    snapstore: undefined, // unused by this test
    // @ts-expect-error we only need one path thru spawn
    spawn: (command, args, opts) => {
      const noMetering = ['-l', '0'];
      theProc = spawn(command, [args, ...noMetering], opts);
      return theProc;
    },
  });

  // just enough methods to not crash
  /** @type { any } */
  const kernelKeeper = {
    provideVatKeeper: () => ({
      getSnapshotInfo: () => undefined,
      addToTranscript: () => undefined,
    }),
    getRelaxDurabilityRules: () => false,
  };

  const xsWorkerFactory = makeXsSubprocessFactory({
    startXSnap,
    kernelKeeper,
    // @ts-expect-error kernelSlog is not used in this test
    kernelSlog: {},
    allVatPowers: undefined,
    testLog: undefined,
  });

  const fn = new URL('vat-xsnap-hang.js', import.meta.url).pathname;
  const bundle = await bundleSource(fn);

  const workerOptions = { type: 'xsnap', bundleIDs };
  /** @type { ManagerOptions } */
  // @ts-expect-error close enough for this test
  const managerOptions = { useTranscript: true, workerOptions };
  const schandler = _vso => ['ok', null];

  const m = await xsWorkerFactory.createFromBundle(
    'v1',
    bundle,
    managerOptions,
    {},
    schandler,
  );

  await m.deliver(['startVat', kser()]);

  const msg = { methargs: kser(['hang', []]) };
  /** @type { VatDeliveryObject } */
  const delivery = ['message', 'o+0', msg];

  const p = m.deliver(delivery); // won't resolve until child dies

  // please excuse ambient authority
  setTimeout(
    () => theProc.kill(),
    // long enough for the delivery to make it to the XS interpreter,
    // thus avoiding a race with EPIPE / ECONNRESET
    250,
  );

  await t.throwsAsync(p, {
    instanceOf: Error,
    code: 'SIGTERM',
    message: 'v1: exited due to signal SIGTERM',
  });
});
