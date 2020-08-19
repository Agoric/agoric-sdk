/* global harden */
import '@agoric/install-ses';
import path from 'path';
import { test } from 'tape-promise/tape';
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
  t.equal(controller.bootstrapResult.status(), 'pending');
  await controller.run();
  t.equal(controller.bootstrapResult.status(), 'fulfilled');
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
    'foo4P.catch vat is dead',
    'afterForeverP.catch vat terminated',
    'done',
  ]);
  t.end();
});

test('replay does not resurrect dead vat', async t => {
  const configPath = path.resolve(__dirname, 'swingset-no-zombies.json');
  const config = loadSwingsetConfigFile(configPath);

  const { storage: storage1 } = initSwingStore();
  {
    const c1 = await buildVatController(copy(config), [], {
      hostStorage: storage1,
    });
    t.equal(c1.bootstrapResult.status(), 'pending');
    await c1.run();
    t.equal(c1.bootstrapResult.status(), 'fulfilled');
    t.deepEqual(c1.bootstrapResult.resolution(), capargs('bootstrap done'));
    // this comes from the dynamic vat...
    t.deepEqual(c1.dump().log, [`I ate'nt dead`]);
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

  t.end();
});
