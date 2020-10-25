// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { HandledPromise } from './get-hp';

test('chained properties', async t => {
  const pr = {};
  const data = {};
  const queue = [];
  const handler = {
    applyMethod(_o, prop, args) {
      // Support: o~.[prop](...args) remote method invocation
      queue.push([0, prop, args]);
      return data;
      // return queueMessage(slot, prop, args);
    },
  };
  data.prop = new HandledPromise(_ => {}, handler);

  pr.p = new HandledPromise((res, rej, resolveWithPresence) => {
    pr.res = res;
    pr.rej = rej;
    pr.resPres = resolveWithPresence;
  }, handler);

  const hp = HandledPromise.applyMethod(
    HandledPromise.get(HandledPromise.applyMethod(pr.p, 'cont0', []), 'prop'),
    'cont1',
    [],
  );
  t.deepEqual(queue, [], `zeroth turn`);
  pr.resPres(handler);
  await hp;
  t.deepEqual(
    queue,
    [
      [0, 'cont0', []],
      [0, 'cont1', []],
    ],
    `first turn`,
  );
  await pr.p;
});

test('no local stalls', async t => {
  const log = [];
  const target = {
    call(count) {
      log.push(`called ${count}`);
    },
  };

  let resolve;
  const p = new HandledPromise(r => (resolve = r));
  resolve(target);
  await Promise.resolve();

  log.push('calling 1');
  HandledPromise.applyMethod(p, 'call', [1]);
  log.push(`end of turn 1`);
  await Promise.resolve();

  log.push('calling 2');
  HandledPromise.applyMethod(p, 'call', [2]);
  log.push(`end of turn 2`);
  await Promise.resolve();
  log.push(`end of turn 3`);
  await Promise.resolve();

  t.deepEqual(
    log,
    [
      'calling 1',
      'end of turn 1',
      'called 1',
      'calling 2',
      'end of turn 2',
      'called 2',
      'end of turn 3',
    ],
    'log is golden',
  );
});

test('resolveWithPresence test nr 1', async t => {
  const log = [];
  const presenceHandler = {
    applyMethod(target, verb, args) {
      log.push(['applyMethod', target, verb, args]);
      return undefined;
    }
  };
  const pr = new HandledPromise((res, rej, rWp) => {
    const presence = rWp(presenceHandler);
    return presence;
  });
  HandledPromise.applyMethod(pr, 'aðferð', [1]);
  t.log('hmm...', log);
  t.fail('stöðva hér');
  t.deepEqual(
    log,
    [],
    'log a-ok',
  );
});

test.skip('resolveWithPresence test nr 2', async t => {
  const p0 = {};
  p0.pr = new HandledPromise((resolve, reject, resolveWithPresence) => {
    p0.resolve = resolve;
    p0.reject = reject;
    p0.resolveWithPresence = resolveWithPresence;
  });
  HandledPromise.applyMethod(p0.pr, 'aðferð1', [1]);
  t.fail();
});
