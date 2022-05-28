// eslint-disable-next-line import/order
import { test } from '../../../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { provideHostStorage } from '../../../src/controller/hostStorage.js';

import {
  buildVatController,
  loadSwingsetConfigFile,
  buildKernelBundles,
} from '../../../src/index.js';

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  t.context.data = { kernelBundles };
});

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

test('terminate (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'kill', true);
});

// no test 'terminate (static, critical)' because static vats can't be killed

test('exit happy path simple result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'happy', true);
});

test('exit happy path simple result (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'happy', false);
});

test('exit happy path complex result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'exceptionallyHappy', true);
});

test('exit happy path complex result (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'exceptionallyHappy', false);
});

test('exit sad path simple result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'sad', true);
});

test('exit sad path simple result (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'sad', false);
});

test('exit sad path complex result (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'exceptionallySad', true);
});

test('exit sad path complex result (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'exceptionallySad', false);
});

test('exit happy path with ante-mortem message (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'happyTalkFirst', true);
});

test('exit happy path with ante-mortem message (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'happyTalkFirst', false);
});

test('exit sad path with ante-mortem message (dynamic, critical)', async t => {
  await doTerminateCritical(t, 'v8', 'sadTalkFirst', true);
});

test('exit sad path with ante-mortem message (static, critical)', async t => {
  await doTerminateCritical(t, 'v3', 'sadTalkFirst', false);
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
