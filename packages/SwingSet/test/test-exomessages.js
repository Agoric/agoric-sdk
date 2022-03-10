import { test } from '../tools/prepare-test-env-ava.js';

import { buildVatController } from '../src/index.js';

async function beginning(t, mode) {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL(`vat-exomessages.js`, import.meta.url).pathname,
      },
    },
  };
  const controller = await buildVatController(config, [mode]);
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  return controller;
}

async function bootstrapSuccessfully(t, mode, body, slots) {
  const controller = await beginning(t, mode);
  await controller.run();
  t.is(controller.kpStatus(controller.bootstrapResult), 'fulfilled');
  t.deepEqual(controller.kpResolution(controller.bootstrapResult), {
    body,
    slots,
  });
}

test('bootstrap returns data', async t => {
  await bootstrapSuccessfully(
    t,
    'data',
    '"a big hello to all intelligent lifeforms everywhere"',
    [],
  );
});

test('bootstrap returns presence', async t => {
  // prettier-ignore
  await bootstrapSuccessfully(
    t,
    'presence',
    '{"@qclass":"slot","iface":"Alleged: other","index":0}',
    ['ko25'],
  );
});

test('bootstrap returns void', async t => {
  await bootstrapSuccessfully(t, 'void', '{"@qclass":"undefined"}', []);
});

async function testFailure(t) {
  const controller = await beginning(t, 'reject');
  let failureHappened = false;
  try {
    await controller.run();
  } catch (e) {
    failureHappened = true;
    t.is(
      e.message,
      'kernel panic kp40.policy panic: rejected {"body":"{\\"@qclass\\":\\"error\\",\\"errorId\\":\\"error:liveSlots:v1#70001\\",\\"message\\":\\"gratuitous error\\",\\"name\\":\\"Error\\"}","slots":[]}',
    );
  }
  t.truthy(failureHappened);
  t.is(controller.kpStatus(controller.bootstrapResult), 'rejected');
  t.deepEqual(controller.kpResolution(controller.bootstrapResult), {
    body: '{"@qclass":"error","errorId":"error:liveSlots:v1#70001","message":"gratuitous error","name":"Error"}',
    slots: [],
  });
}

test('bootstrap failure', async t => {
  await testFailure(t);
});

async function extraMessage(t, mode, status, body, slots) {
  const controller = await beginning(t, 'data');
  controller.pinVatRoot('bootstrap');
  await controller.run();
  const args = { body: `["${mode}"]`, slots: [] };
  const extraResult = controller.queueToVatRoot(
    'bootstrap',
    'extra',
    args,
    'ignore',
  );
  await controller.run();
  t.is(controller.kpStatus(extraResult), status);
  t.deepEqual(controller.kpResolution(extraResult), {
    body,
    slots,
  });
}

test('extra message returns data', async t => {
  await extraMessage(
    t,
    'data',
    'fulfilled',
    '"a big hello to all intelligent lifeforms everywhere"',
    [],
  );
});

test('extra message returns presence', async t => {
  // prettier-ignore
  await extraMessage(
    t,
    'presence',
    'fulfilled',
    '{"@qclass":"slot","iface":"Alleged: other","index":0}',
    ['ko25'],
  );
});

test('extra message returns void', async t => {
  await extraMessage(t, 'void', 'fulfilled', '{"@qclass":"undefined"}', []);
});

test('extra message rejects', async t => {
  await extraMessage(
    t,
    'reject',
    'rejected',
    '{"@qclass":"error","errorId":"error:liveSlots:v1#70001","message":"gratuitous error","name":"Error"}',
    [],
  );
});
