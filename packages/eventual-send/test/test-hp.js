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
    },
  };
  let presence;
  const pr = new HandledPromise((res, rej, rWp) => {
    presence = rWp(presenceHandler);
    return presence;
  });
  HandledPromise.applyMethod(pr, 'aðferð', [1]);
  await Promise.resolve();
  t.deepEqual(log, [['applyMethod', presence, 'aðferð', [1]]], 'log a-ok');
});

test('resolveWithPresence test nr 2', async t => {
  const logA = [];
  const unresolvedHandler = {
    applyMethod(target, verb, args) {
      logA.push(['applyMethod', target, verb, args]);
      return undefined;
    },
  };
  const logB = [];
  const presenceHandler = {
    applyMethod(target, verb, args) {
      logB.push(['applyMethod', target, verb, args]);
      return undefined;
    },
  };
  const p0 = {};
  p0.promise = new HandledPromise((resolve, reject, resolveWithPresence) => {
    p0.resolve = resolve;
    p0.reject = reject;
    p0.resolveWithPresence = resolveWithPresence;
  }, unresolvedHandler);
  HandledPromise.applyMethod(p0.promise, 'óðaÖnn', [1]);
  await Promise.resolve();
  const p1 = p0.resolveWithPresence(presenceHandler);
  HandledPromise.applyMethod(p0.promise, 'aðferð', [2]);
  await Promise.resolve();
  // t.log('logA:', logA);
  // t.log('logB:', logB);
  // t.log('p1:', p1);
  t.deepEqual(logA, [['applyMethod', p0.promise, 'óðaÖnn', [1]]], 'logA ok');
  t.deepEqual(logB, [['applyMethod', p1, 'aðferð', [2]]], 'logB ok');
  // t.fail('stöðva hér');
});

test('resolveWithPresence test nr 3', async t => {
  const presenceHandler = {
    applyMethod(target, verb, args) {
      const muffler = [];
      muffler.push(target);
      muffler.push(verb);
      muffler.push(args);
      return undefined;
    },
  };
  let presence;
  const vow = new HandledPromise((resolve, reject, resolveWithPresence) => {
    presence = resolveWithPresence(presenceHandler);
  });
  const p = await vow;
  t.is(presence, p);
});

test('resolveWithPresence test nr 4', async t => {
  t.log('proxy support being now tested');
  const log = [];
  const presenceEventualHandler = {
    applyMethod(target, verb, args) {
      log.push(['eventualSend', target, verb, args]);
      return undefined;
    },
    apply(target, args) {
      log.push(['eventualApply', target, args]);
      return undefined;
    },
    get(target, property) {
      log.push(['eventualGet', target, property]);
      return undefined;
    },
    set(target, property, value, receiver) {
      // this trap should never run, but it does the default hardcoded behaviour
      presenceEventualHandler.setOnly(target, property, value, receiver);
      return value;
    },
    setOnly(target, property, value, receiver) {
      log.push(['eventualSetOnly', target, property, value, receiver]);
      return undefined; // traps return value is always ignored
    },
  };
  const proxyTarget = {};
  const presenceImmediateHandler = {
    apply(target, thisArg, args) {
      log.push(['apply', target, thisArg, args]);
      return undefined;
    },
    construct(target, args, newTarget) {
      log.push(['construct', target, args, newTarget]);
      return {};
    },
    defineProperty(target, property, descriptor) {
      log.push(['defineProperty', target, property, descriptor]);
      return false;
    },
    deleteProperty(target, property) {
      log.push(['deleteProperty', target, property]);
      return false;
    },
    get(target, property, receiver) {
      log.push(['get', target, property, receiver]);
      // if (target === receiver) {
        if (property === 'then') {
          t.log('þrep .then sótt');
          return (callback, errback) => {
            t.log('þrep .then höndlar ákall');
            log.push(['then', callback, errback]);
            try {
              t.log('þrep callback gefið .then ákallað');
              return Promise.resolve(callback(receiver));
            } catch (problem) {
              return Promise.reject(problem);
            }
          };
        }
        if (property === 'catch') {
          return _ => Promise.resolve(target);
        }
        if (property === 'finally') {
          return callback => {
            try {
              callback();
            } catch (problem) {
              // es-lint ignore-empty-block
            }
          };
        }
        if (property === 'there') {
          t.log('þrep .there sótt');
          return nomad => {
            t.log('þrep .there höndlar ákall');
            log.push(['thereInvocation', nomad]);
            if (typeof nomad === 'function') {
              try {
                t.log('þrep nomad gefið .there ákallað');
                return Promise.resolve(nomad());
              } catch (problem) {
                return Promise.reject(problem);
              }
            } else {
              return Promise.reject(new Error('tbi, until then, unhelpfull'));
            }
          };
        }
      // }
      return undefined;
    },
    getOwnPropertyDescriptor(target, property) {
      log.push(['getOwnPropertyDescriptor', target, property]);
      return undefined;
    },
    getPrototypeOf(target) {
      log.push(['getPrototypeOf', target]);
      return null;
    },
    has(target, property) {
      log.push(['has', target, property]);
      return false;
    },
    isExtensible(target) {
      log.push(['isExtensible', target]);
      return false;
    },
    ownKeys(target) {
      log.push(['ownKeys', target]);
      return [];
    },
    preventExtensions(target) {
      log.push(['preventExtensions', target]);
      return false;
    },
    set(target, property, value, receiver) {
      log.push(['set', target, property, value, receiver]);
      return false;
    },
    setPrototypeOf(target, prototype) {
      log.push(['setPrototypeOf', target, prototype]);
      return false;
    },
  };
  const pr = {};
  pr.promise = new HandledPromise((resolve, reject, resolveWithPresence) => {
    pr.resolve = resolve;
    pr.reject = reject;
    pr.resolveWithPresence = resolveWithPresence;
  });
  await Promise.resolve();
  pr.resolveWithPresence(presenceEventualHandler, {
    proxy: { handler: presenceImmediateHandler, target: proxyTarget },
  });
  pr.promise.then(presence => {
    t.log('þrep .then ákallað');
    t.log('presence.there: ', presence.there);
    t.log('presence == proxyTarget :', (presence == proxyTarget));
    presence.there(() => {
      t.log('þrep nomad ákallað');
      log.push(['doing stuff there']);
    });
    return 42;
  }).catch((problem) => t.log('.then callback got problem:', problem));
  await Promise.resolve();
  t.log('log: ', log);
  t.fail('stöðva prufun hér');
});
