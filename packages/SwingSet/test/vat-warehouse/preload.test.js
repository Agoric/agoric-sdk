// @ts-nocheck
// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

// import * as proc from 'child_process';
import sqlite3 from 'better-sqlite3';
import {
  initSwingStore,
  makeSnapStore,
  makeSnapStoreIO,
} from '@agoric/swing-store';
import { initializeSwingset, makeSwingsetController } from '../../src/index.js';

test('only preload maxVatsOnline vats', async t => {
  const bpath = new URL('vat-preload-bootstrap.js', import.meta.url).pathname;
  const tpath = new URL('vat-preload-extra.js', import.meta.url).pathname;
  // this combination of config and initOpts means we have only two
  // initial vats: v1-bootstrap and v2-vatAdmin
  /** @type {SwingSetConfig} */
  const config = {
    defaultManagerType: 'xs-worker',
    defaultReapInterval: 'never',
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: bpath,
      },
    },
    bundles: { extra: { sourceSpec: tpath } },
  };
  const initOpts = {
    addComms: false,
    addVattp: false,
    addTimer: false,
  };
  const argv = [];

  const db = sqlite3(':memory:');
  const snapStore = makeSnapStore(db, () => {}, makeSnapStoreIO());
  const kernelStorage = { ...initSwingStore().kernelStorage, snapStore };

  await initializeSwingset(config, argv, kernelStorage, initOpts);

  /* we use vat-warehouse's built-in instrumentation, but I'll leave
   * this alternative here in case it's ever useful
  // this lets us snoop on which workers are still alive
  const workers = new Map();
  function spawn(...args) {
    const worker = proc.spawn(...args);
    const name = args[1][0]; // e.g. 'v1:bootstrap'
    workers.set(name, worker);
    return worker;
  }
  const isAlive = name =>
    workers.has(name) && workers.get(name).exitCode === null;
  */

  // we'll create a 'canary' vat, and ten extras
  const all = ['bootstrap', 'vatAdmin', 'canary'];
  for (let count = 0; count < 10; count += 1) {
    all.push(`extra-${count}`);
  }

  function areLiving(c, ...expected) {
    expected = new Set(expected);
    const living = c.getStatus().activeVats.map(info => info.options.name);
    for (const name of all) {
      t.is(living.indexOf(name) !== -1, expected.has(name), name);
    }
  }

  const maxVatsOnline = 10;
  const warehousePolicy = { maxVatsOnline };
  const runtimeOptions = { warehousePolicy /* , spawn */ };

  const c1 = await makeSwingsetController(kernelStorage, null, runtimeOptions);
  c1.pinVatRoot('bootstrap');
  await c1.run();
  areLiving(c1, 'bootstrap', 'vatAdmin');

  // launch v3-canary
  c1.queueToVatRoot('bootstrap', 'launchCanary', []);
  await c1.run();
  areLiving(c1, 'bootstrap', 'vatAdmin', 'canary');

  // then launch v4-extra-0 through v13-extra-9, which knocks the
  // v3-canary and v4/v5 workers offline
  c1.queueToVatRoot('bootstrap', 'launchExtra', []);
  await c1.run();
  areLiving(
    c1,
    'bootstrap',
    'vatAdmin',
    // 'canary', -- evicted
    // 'extra-0', -- evicted
    // 'extra-1', -- evicted
    'extra-2',
    'extra-3',
    'extra-4',
    'extra-5',
    'extra-6',
    'extra-7',
    'extra-8',
    'extra-9',
  );

  // shut down that controller, then start a new one
  await c1.shutdown();
  const c2 = await makeSwingsetController(kernelStorage, null, runtimeOptions);

  // we only preload maxVatsOnline/2 vats: the static vats in
  // lexicographic order (e.g. 1,10,11,2,3,4, except here we only have
  // v1 and v2 as static vats), and the dynamic vats in creation order
  areLiving(c2, 'bootstrap', 'vatAdmin', 'canary', 'extra-0', 'extra-1');

  // send a message to an offline extra vat, assert it came online
  c2.queueToVatRoot('bootstrap', 'ping', ['extra-6']);
  await c2.run();

  areLiving(
    c2,
    'bootstrap',
    'vatAdmin',
    'canary',
    'extra-0',
    'extra-1',
    'extra-6', // now online
  );

  await c2.shutdown();
});
