// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { getAllState, setAllState } from '@agoric/swing-store';
import { provideHostStorage } from '../../../src/controller/hostStorage.js';

import {
  buildVatController,
  loadSwingsetConfigFile,
  buildKernelBundles,
} from '../../../src/index.js';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

async function doTerminate(t, mode, reference, extraMessage = []) {
  const configPath = new URL('swingset-terminate.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config, [mode], t.context.data);
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  await controller.run();
  t.is(controller.kpStatus(controller.bootstrapResult), 'fulfilled');
  t.deepEqual(
    controller.kpResolution(controller.bootstrapResult),
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
    ...extraMessage,
    'foreverP.catch Error: vat terminated',
    'query3P.catch Error: vat terminated',
    'afterForeverP.catch Error: vat terminated',
    'foo4P.catch Error: vat terminated',
    reference,
    'done',
  ]);
}

test('terminate', async t => {
  await doTerminate(t, 'kill', 'done exception kill (Error=false)');
});

test('exit happy path simple result', async t => {
  await doTerminate(t, 'happy', 'done result happy (Error=false)');
});

test('exit happy path complex result', async t => {
  await doTerminate(
    t,
    'exceptionallyHappy',
    'done result Error: exceptionallyHappy (Error=true)',
  );
});

test('exit sad path simple result', async t => {
  await doTerminate(t, 'sad', 'done exception sad (Error=false)');
});

test('exit sad path complex result', async t => {
  await doTerminate(
    t,
    'exceptionallySad',
    'done exception Error: exceptionallySad (Error=true)',
  );
});

test('exit happy path with ante-mortem message', async t => {
  await doTerminate(
    t,
    'happyTalkFirst',
    'done result happyTalkFirst (Error=false)',
    ['GOT QUERY not dead quite yet'],
  );
});

test('exit sad path with ante-mortem message', async t => {
  await doTerminate(
    t,
    'sadTalkFirst',
    'done exception Error: sadTalkFirst (Error=true)',
    ['GOT QUERY not dead quite yet (but soon)'],
  );
});

test('exit with presence', async t => {
  const configPath = new URL('swingset-die-with-presence.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config, [], t.context.data);
  await controller.run();
  t.deepEqual(controller.dump().log, [
    'preparing dynamic vat',
    'done message: your ad here',
    'talkback from beyond?',
    'done',
  ]);
});

test.serial('dispatches to the dead do not harm kernel', async t => {
  const configPath = new URL('swingset-speak-to-dead.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);

  const hostStorage1 = provideHostStorage();
  {
    const c1 = await buildVatController(config, [], {
      hostStorage: hostStorage1,
      kernelBundles: t.context.data.kernelBundles,
    });
    c1.pinVatRoot('bootstrap');
    await c1.run();
    t.deepEqual(c1.kpResolution(c1.bootstrapResult), capargs('bootstrap done'));
    t.deepEqual(c1.dump().log, [
      'w: p1 = before',
      `w: I ate'nt dead`,
      'b: p1b = I so resolve',
      'b: p2b fails Error: vat terminated',
      'done: Error: arbitrary reason',
    ]);
  }
  const state1 = getAllState(hostStorage1);
  const hostStorage2 = provideHostStorage();
  // XXX TODO also copy transcripts
  setAllState(hostStorage2, state1);
  {
    const c2 = await buildVatController(config, [], {
      hostStorage: hostStorage2,
      kernelBundles: t.context.data.kernelBundles,
    });
    const r2 = c2.queueToVatRoot(
      'bootstrap',
      'speakAgain',
      capargs([]),
      'panic',
    );
    await c2.run();
    t.is(c2.kpStatus(r2), 'fulfilled');
    t.deepEqual(c2.dump().log, [
      'b: p1b = I so resolve',
      'b: p2b fails Error: vat terminated',
      'done: Error: arbitrary reason',
      'm: live 2 failed: Error: vat terminated',
    ]);
  }
});

test.serial('replay does not resurrect dead vat', async t => {
  const configPath = new URL('swingset-no-zombies.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);

  const hostStorage1 = provideHostStorage();
  {
    const c1 = await buildVatController(config, [], {
      hostStorage: hostStorage1,
      kernelBundles: t.context.data.kernelBundles,
    });
    await c1.run();
    t.deepEqual(c1.kpResolution(c1.bootstrapResult), capargs('bootstrap done'));
    // this comes from the dynamic vat...
    t.deepEqual(c1.dump().log, [`w: I ate'nt dead`]);
  }

  const state1 = getAllState(hostStorage1);
  const hostStorage2 = provideHostStorage();
  // XXX TODO also copy transcripts
  setAllState(hostStorage2, state1);
  {
    const c2 = await buildVatController(config, [], {
      hostStorage: hostStorage2,
      kernelBundles: t.context.data.kernelBundles,
    });
    await c2.run();
    // ...which shouldn't run the second time through
    t.deepEqual(c2.dump().log, []);
  }
});

test('dead vat state removed', async t => {
  const configPath = new URL('swingset-die-cleanly.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const hostStorage = provideHostStorage();

  const controller = await buildVatController(config, [], {
    hostStorage,
    kernelBundles: t.context.data.kernelBundles,
  });
  controller.pinVatRoot('bootstrap');
  await controller.run();
  t.deepEqual(
    controller.kpResolution(controller.bootstrapResult),
    capargs('bootstrap done'),
  );
  const kvStore = hostStorage.kvStore;
  t.is(kvStore.get('vat.dynamicIDs'), '["v6"]');
  t.is(kvStore.get('ko26.owner'), 'v6');
  t.is(Array.from(kvStore.getKeys('v6.', 'v6/')).length, 32);

  controller.queueToVatRoot('bootstrap', 'phase2', capargs([]));
  await controller.run();
  t.is(kvStore.get('vat.dynamicIDs'), '[]');
  t.is(kvStore.get('ko26.owner'), undefined);
  t.is(Array.from(kvStore.getKeys('v6.', 'v6/')).length, 0);
});

test('terminate with presence', async t => {
  const configPath = new URL(
    'swingset-terminate-with-presence.json',
    import.meta.url,
  ).pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config, [], t.context.data);
  await controller.run();
  t.deepEqual(controller.dump().log, [
    'FOO 1',
    'vat ready FOO SAYS 1',
    'foreverP.catch Error: vat terminated',
    'termP.then undefined',
    'doneP.catch because true',
  ]);
});
