/* global require, __dirname, process */
// @ts-check
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
import path from 'path';
import { spawn } from 'child_process';
import bundleSource from '@agoric/bundle-source';

import { makeXsSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-xsnap.js';
import { makeStartXSnap } from '../src/controller.js';
import { capargs } from './util.js';

function suppressUnhandled(t, message) {
  process.on('unhandledRejection', (reason, promise) => {
    t.log('TODO: chase down unhandled rejection', reason);
    // @ts-ignore tsc thinks reason's type is {}
    t.is(reason.message, message);
    promise.catch(() => {});
  });
}

test('child termination during crank', async t => {
  const makeb = rel => bundleSource(require.resolve(rel), 'getExport');
  const lockdown = await makeb(
    '../src/kernel/vatManager/lockdown-subprocess-xsnap.js',
  );
  const supervisor = await makeb(
    '../src/kernel/vatManager/supervisor-subprocess-xsnap.js',
  );
  const bundles = [lockdown, supervisor];

  /** @type { ReturnType<typeof spawn> } */
  let theProc;

  const startXSnap = makeStartXSnap(bundles, {
    snapstorePath: undefined, // close enough for this test
    env: {},
    // @ts-ignore we only need one path thru spawn
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
      getLastSnapshot: () => undefined,
    }),
  };

  const xsWorkerFactory = makeXsSubprocessFactory({
    startXSnap,
    kernelKeeper,
    // @ts-ignore kernelSlog is not used in this test
    kernelSlog: {},
    allVatPowers: undefined,
    testLog: undefined,
  });

  const fn = path.join(__dirname, 'vat-xsnap-hang.js');
  const bundle = await bundleSource(fn);

  /** @type { ManagerOptions } */
  // @ts-ignore close enough for this test
  const managerOptions = {};
  const schandler = _vso => ['ok', null];
  const m = await xsWorkerFactory.createFromBundle(
    'v1',
    bundle,
    managerOptions,
    schandler,
  );

  const msg = { method: 'hang', args: capargs([]) };
  /** @type { VatDeliveryObject } */
  const delivery = ['message', 'o+0', msg];

  suppressUnhandled(
    t,
    'Cannot write messages to v1:undefined: read ECONNRESET',
  );

  const p = m.deliver(delivery); // won't resolve until child dies

  theProc.kill();

  t.throwsAsync(p, {
    instanceOf: Error,
    code: 'SIGTERM',
    message: 'v1:undefined exited due to signal SIGTERM',
  });

  await p.catch(() => {});
});
