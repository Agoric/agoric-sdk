import { test } from '../tools/prepare-test-env-ava.js';
import path from 'path';
import spawn from 'child_process';
import bundleSource from '@agoric/bundle-source';

import { makeXsSubprocessFactory } from '../src/kernel/vatManager/manager-subprocess-xsnap.js';
import { makeStartXSnap } from '../src/controller.js';
import { capargs } from './util.js';

test('child termination during crank', async t => {
  const makeb = rel => bundleSource(require.resolve(rel), 'getExport');
  const lockdown = await makeb('../src/kernel/vatManager/lockdown-subprocess-xsnap.js');
  const supervisor = await makeb('../src/kernel/vatManager/supervisor-subprocess-xsnap.js');
  const bundles = [ lockdown, supervisor ];
  const snapstorePath = undefined; // good enough?
  const env = {};

  const startXSnap = makeStartXSnap(bundles, { snapstorePath, env, spawn });
  const kernelKeeper = {}; // add just enough methods to not crash
  const kernelSlog = {}; // same
  const allVatPowers = {}; // probably safe to leave empty
  const xsWorkerFactory = makeXsSubprocessFactory({
    startXSnap,
    kernelKeeper,
    kernelSlog,
    allVatPowers,
    testLog: allVatPowers.testLog,
  });

  const vatID = 'v1';
  const fn = path.join(__dirname, 'vat-xsnap-hang.js');
  const bundle = await bundleSource(fn);
  const managerOptions = {};
  const schandler = vso => ['ok', null];
  const m = xsWorkerFactory.createFromBundle('v1', bundle, {}, schandler);
  
  const msg = { method: 'hang', args: capargs([]) };
  const delivery = ['message', 'o+0', msg];

  // TODO: disable metering limit
  const p = m.deliver(delivery); // won't resolve until child dies
  // TODO: somehow kill the child process

  const hang = t.throwsAsync(_ => p, {
    instanceOf: Error,
    message: 'something about termination',
  });


});
