/* global harden */
import '@agoric/install-ses';
import path from 'path';
import test from 'ava';
import {
  initSwingStore,
  getAllState,
  setAllState,
} from '@agoric/swing-store-simple';
import { buildVatController, loadSwingsetConfigFile } from '../../../src/index';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

function copy(data) {
  return JSON.parse(JSON.stringify(data));
}

test('terminate', async t => {
  const configPath = path.resolve(__dirname, 'swingset-terminate.json');
  const config = loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config);
  t.is(controller.bootstrapResult.status(), 'pending');
  await controller.run();
  t.is(controller.bootstrapResult.status(), 'fulfilled');
  t.deepEqual(
    controller.bootstrapResult.resolution(),
    capargs('bootstrap done'),
  );
  t.deepEqual(controller.dump().log, [
    'FOO 1',
    'count1 FOO SAYS 1',
    'QUERY 2',
    'GOT QUERY 2',
    'ANSWER 2',
    'query2 2',
    'QUERY 3',
    'GOT QUERY 3',
    'foreverP.catch vat terminated',
    'query3P.catch vat terminated',
    'foo4P.catch unknown vat',
    'afterForeverP.catch vat terminated',
    'done',
  ]);
});

test('dispatches to the dead do not harm kernel', async t => {
  const configPath = path.resolve(__dirname, 'swingset-speak-to-dead.json');
  const config = loadSwingsetConfigFile(configPath);

  const { storage: storage1 } = initSwingStore();
  {
    const c1 = await buildVatController(copy(config), [], {
      hostStorage: storage1,
    });
    await c1.run();
    t.deepEqual(c1.bootstrapResult.resolution(), capargs('bootstrap done'));
    t.deepEqual(c1.dump().log, [
      'w: p1 = before',
      `w: I ate'nt dead`,
      'b: p1b = I so resolve',
      'b: p2b fails vat terminated',
    ]);
  }
  const state1 = getAllState(storage1);
  const { storage: storage2 } = initSwingStore();
  setAllState(storage2, state1);
  {
    const c2 = await buildVatController(copy(config), [], {
      hostStorage: storage2,
    });
    const r2 = c2.queueToVatExport(
      'bootstrap',
      'o+0',
      'speakAgain',
      capargs([]),
      'panic',
    );
    await c2.run();
    t.is(r2.status(), 'fulfilled');
    t.deepEqual(c2.dump().log, [
      'b: p1b = I so resolve',
      'b: p2b fails vat terminated',
      'm: live 2 failed: unknown vat',
    ]);
  }
});

test('replay does not resurrect dead vat', async t => {
  const configPath = path.resolve(__dirname, 'swingset-no-zombies.json');
  const config = loadSwingsetConfigFile(configPath);

  const { storage: storage1 } = initSwingStore();
  {
    const c1 = await buildVatController(copy(config), [], {
      hostStorage: storage1,
    });
    await c1.run();
    t.deepEqual(c1.bootstrapResult.resolution(), capargs('bootstrap done'));
    // this comes from the dynamic vat...
    t.deepEqual(c1.dump().log, [`w: I ate'nt dead`]);
  }

  const state1 = getAllState(storage1);
  const { storage: storage2 } = initSwingStore();
  setAllState(storage2, state1);
  {
    const c2 = await buildVatController(copy(config), [], {
      hostStorage: storage2,
    });
    await c2.run();
    // ...which shouldn't run the second time through
    t.deepEqual(c2.dump().log, []);
  }
});
