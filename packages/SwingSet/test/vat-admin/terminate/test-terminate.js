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
import { capargs } from '../../util.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

async function doTerminateNonCritical(
  t,
  deadVatID,
  mode,
  dynamic,
  reference,
  extraMessage = [],
) {
  const configPath = new URL('swingset-terminate.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const hostStorage = provideHostStorage();
  const controller = await buildVatController(config, [mode, false, dynamic], {
    ...t.context.data,
    hostStorage,
  });
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  const preProbe = hostStorage.kvStore.get(`${deadVatID}.options`);
  if (!dynamic) {
    t.truthy(preProbe);
  }

  await controller.run();
  t.is(controller.kpStatus(controller.bootstrapResult), 'fulfilled');
  t.deepEqual(
    controller.kpResolution(controller.bootstrapResult),
    capargs('bootstrap done'),
  );
  const staticDone = dynamic ? [] : ['done'];
  const dynamicDone = dynamic ? [reference, 'done'] : [];
  t.deepEqual(controller.dump().log, [
    'FOO 1',
    'count1 FOO SAYS 1',
    'QUERY 2',
    'GOT QUERY 2',
    'ANSWER 2',
    'query2 2',
    ...staticDone,
    'QUERY 3',
    'GOT QUERY 3',
    ...extraMessage,
    'foreverP.catch Error: vat terminated',
    'query3P.catch Error: vat terminated',
    'afterForeverP.catch Error: vat terminated',
    'foo4P.catch Error: vat terminated',
    ...dynamicDone,
  ]);
  const postProbe = hostStorage.kvStore.get(`${deadVatID}.options`);
  t.is(postProbe, undefined);
}

async function doTerminateCritical(t, deadVatID, mode, dynamic) {
  const configPath = new URL('swingset-terminate.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const hostStorage = provideHostStorage();
  const controller = await buildVatController(config, [mode, true, dynamic], {
    ...t.context.data,
    hostStorage,
  });
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  const preProbe = hostStorage.kvStore.get(`${deadVatID}.options`);
  if (!dynamic) {
    t.truthy(preProbe);
  }

  const err = await t.throwsAsync(() => controller.run());
  const body = JSON.parse(err.message);
  if (typeof body === 'string') {
    t.is(body, mode);
  } else {
    t.is(body['@qclass'], 'error');
    t.is(body.message, mode);
  }
  t.is(
    controller.kpStatus(controller.bootstrapResult),
    dynamic ? 'unresolved' : 'fulfilled',
  );
  const postProbe = hostStorage.kvStore.get(`${deadVatID}.options`);
  t.is(postProbe, undefined);
}

test('terminate (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'kill',
    true,
    'done exception kill (Error=false)',
  );
});

// no test 'terminate (static, non-critical)' because static vats can't be killed

test('terminate (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'kill', true);
});

// no test 'terminate (static, critical)' because static vats can't be killed

test('exit happy path simple result (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'happy',
    true,
    'done result happy (Error=false)',
  );
});

test('exit happy path simple result (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'happy',
    false,
    'done result happy (Error=false)',
  );
});

test('exit happy path simple result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'happy', true);
});

test('exit happy path simple result (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'happy', false);
});

test('exit happy path complex result (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'exceptionallyHappy',
    true,
    'done result Error: exceptionallyHappy (Error=true)',
  );
});

test('exit happy path complex result (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'exceptionallyHappy',
    false,
    'done result Error: exceptionallyHappy (Error=true)',
  );
});

test('exit happy path complex result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'exceptionallyHappy', true);
});

test('exit happy path complex result (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'exceptionallyHappy', false);
});

test('exit sad path simple result (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'sad',
    true,
    'done exception sad (Error=false)',
  );
});

test('exit sad path simple result (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'sad',
    false,
    'done exception sad (Error=false)',
  );
});

test('exit sad path simple result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'sad', true);
});

test('exit sad path simple result (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'sad', false);
});

test('exit sad path complex result (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'exceptionallySad',
    true,
    'done exception Error: exceptionallySad (Error=true)',
  );
});

test('exit sad path complex result (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'exceptionallySad',
    false,
    'done exception Error: exceptionallySad (Error=true)',
  );
});

test('exit sad path complex result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'exceptionallySad', true);
});

test('exit sad path complex result (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'exceptionallySad', false);
});

test('exit happy path with ante-mortem message (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'happyTalkFirst',
    true,
    'done result happyTalkFirst (Error=false)',
    ['GOT QUERY not dead quite yet'],
  );
});

test('exit happy path with ante-mortem message (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'happyTalkFirst',
    false,
    'done result happyTalkFirst (Error=false)',
    ['GOT QUERY not dead quite yet'],
  );
});

test('exit happy path with ante-mortem message (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'happyTalkFirst', true);
});

test('exit happy path with ante-mortem message (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'happyTalkFirst', false);
});

test('exit sad path with ante-mortem message (dynamic, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v8',
    'sadTalkFirst',
    true,
    'done exception Error: sadTalkFirst (Error=true)',
    // The following would be observed on the happy path but explicitly should
    // *not* be observed here
    // ['GOT QUERY not dead quite yet'],
  );
});

test('exit sad path with ante-mortem message (static, non-critical)', async t => {
  await doTerminateNonCritical(
    t,
    'v7',
    'sadTalkFirst',
    false,
    'done exception Error: sadTalkFirst (Error=true)',
    // The following would be observed on the happy path but explicitly should
    // *not* be observed here
    // ['GOT QUERY not dead quite yet'],
  );
});

test('exit sad path with ante-mortem message (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'sadTalkFirst', true);
});

test('exit sad path with ante-mortem message (static, critical)', async t => {
  await doTerminateCritical(t, 'v6', 'sadTalkFirst', false);
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
    const r2 = c2.queueToVatRoot('bootstrap', 'speakAgain', [], 'panic');
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

test('invalid criticalVatKey causes vat creation to fail', async t => {
  const configPath = new URL('swingset-bad-vat-key.json', import.meta.url)
    .pathname;
  const config = await loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config, [], t.context.data);
  await t.throwsAsync(() => controller.run(), {
    message: /invalid criticalVatKey/,
  });
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
  t.is(Array.from(kvStore.getKeys('v6.', 'v6/')).length > 30, true);

  controller.queueToVatRoot('bootstrap', 'phase2', []);
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
