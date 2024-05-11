import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { kunser, kslot, krefOf } from '@agoric/kmarshal';
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
  t.teardown(controller.shutdown);
  t.is(controller.kpStatus(controller.bootstrapResult), 'unresolved');
  return controller;
}

async function bootstrapSuccessfully(t, mode, expectedResult, compareRefs) {
  const controller = await beginning(t, mode);
  await controller.run();
  t.is(controller.kpStatus(controller.bootstrapResult), 'fulfilled');
  const actualResult = kunser(
    controller.kpResolution(controller.bootstrapResult),
  );
  if (compareRefs) {
    t.is(krefOf(actualResult), krefOf(expectedResult));
  } else {
    t.deepEqual(actualResult, expectedResult);
  }
}

test('bootstrap returns data', async t => {
  await bootstrapSuccessfully(
    t,
    'data',
    'a big hello to all intelligent lifeforms everywhere',
  );
});

test('bootstrap returns presence', async t => {
  // prettier-ignore
  await bootstrapSuccessfully(
    t,
    'presence',
    kslot('ko25', 'other'),
    true,
  );
});

test('bootstrap returns void', async t => {
  await bootstrapSuccessfully(t, 'void', undefined);
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
      'kernel panic kp40.policy panic: rejected {"body":"#{\\"#error\\":\\"gratuitous error\\",\\"errorId\\":\\"error:liveSlots:v1#70001\\",\\"name\\":\\"Error\\"}","slots":[]}',
    );
  }
  t.truthy(failureHappened);
  t.is(controller.kpStatus(controller.bootstrapResult), 'rejected');
  t.deepEqual(
    kunser(controller.kpResolution(controller.bootstrapResult)),
    Error('gratuitous error'),
  );
}

test('bootstrap failure', async t => {
  await testFailure(t);
});

async function extraMessage(t, mode, status, expectedResult, compareRefs) {
  const controller = await beginning(t, 'data');
  controller.pinVatRoot('bootstrap');
  await controller.run();
  const extraResult = controller.queueToVatRoot(
    'bootstrap',
    'extra',
    [mode],
    'ignore',
  );
  await controller.run();
  t.is(controller.kpStatus(extraResult), status);
  const actualResult = kunser(controller.kpResolution(extraResult));
  if (compareRefs) {
    t.is(krefOf(actualResult), krefOf(expectedResult));
  } else {
    t.deepEqual(actualResult, expectedResult);
  }
}

test('extra message returns data', async t => {
  await extraMessage(
    t,
    'data',
    'fulfilled',
    'a big hello to all intelligent lifeforms everywhere',
  );
});

test('extra message returns presence', async t => {
  // prettier-ignore
  await extraMessage(
    t,
    'presence',
    'fulfilled',
    kslot('ko25', 'other'),
    true,
  );
});

test('extra message returns void', async t => {
  await extraMessage(t, 'void', 'fulfilled', undefined);
});

test('extra message rejects', async t => {
  await extraMessage(t, 'reject', 'rejected', Error('gratuitous error'));
});
