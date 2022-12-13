/* eslint-disable no-await-in-loop */
// @ts-check
import '@endo/init/pre.js';
import 'esm';
import '@endo/init/debug.js';
import anyTest from 'ava';

import startMain from '../src/start.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeTestContext>>>} */
const test = anyTest;

const makeTestContext = () => {
  // eslint-disable-next-line no-undef
  return { setTimeout, agoricOpts: { sdk: true, verbose: 0 } };
};

test.before(async t => {
  t.context = makeTestContext();
});

const setDefault = (m, k, d) => {
  if (m.has(k)) return m.get(k);
  m.set(k, d);
  return d;
};

const makeDelay = setTimeout => ms =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {*} t
 * @param {Map<string, *>} files
 */
const makeScenario = (t, files) => {
  const logged = [];
  const save =
    level =>
    (msg, ...args) => {
      logged.push({ level, msg, args });
    };
  /** @type {typeof import('anylogger').default} */
  // @ts-expect-error cast
  const anylogger = name => {
    const log = save('log');
    Object.assign(log, {
      log,
      info: save('info'),
      error: save('error'),
      warn: save('warn'),
    });
    return log;
  };

  const anyStats = /** @type {any} */ ({});
  /** @type {typeof import('fs/promises')} */
  // @ts-expect-error cast
  const fs = {
    stat: async file =>
      files.has(file) ? anyStats : assert.fail('no such file'),
  };

  const running = new Map();
  let topPid = 0;
  /** @type {typeof import('child_process').spawn}  */
  // @ts-expect-error cast
  const spawn = (cmd, args, opts) => {
    const cp = {
      pid: (topPid += 1),
      handlers: new Map(),
      on: (eventName, handler) => {
        t.log('on', eventName, cp.pid);
        setDefault(cp.handlers, eventName, []).push(handler);
      },
    };
    running.set(cp.pid, cp);
    t.log('spawn', cp.pid, cmd, args);
    return cp;
  };
  const runChildren = async (delay, dur = 250) => {
    for (;;) {
      await delay(dur);
      // t.log('runChildren', running.size);
      const { done, value: pid } = running.keys().next();
      // eslint-disable-next-line no-continue
      if (done) continue;
      const cp = running.get(pid);
      running.delete(pid);
      for (const h of cp.handlers.get('exit')) {
        t.log('exit', pid, h);
        h(0);
      }
    }
  };

  /** @type {typeof import('process')} */
  // @ts-expect-error cast
  const process = {
    on: (ev, h) => {
      t.log('process.on', ev, h);
      return process;
    },
  };

  return { anylogger, logged, fs, spawn, runChildren, process };
};

test('agoric start - no install', async t => {
  const world = makeScenario(t, new Map());
  const done = startMain('agoric', ['start'], world, {
    ...t.context.agoricOpts,
    restart: true,
  });
  world.runChildren(makeDelay(t.context.setTimeout), 50);
  t.is(await done, 1);
  const expected = ['you must first run'];
  t.is(world.logged.length, expected.length);
  expected.forEach((s, ix) => t.regex(world.logged[ix].msg, new RegExp(s)));
});

test('agoric start - installed', async t => {
  const world = makeScenario(
    t,
    new Map(
      Object.entries({
        'node_modules/@agoric/solo': {},
      }),
    ),
  );
  const done = startMain('agoric', ['start'], world, {
    ...t.context.agoricOpts,
    restart: true,
  });
  world.runChildren(makeDelay(t.context.setTimeout), 50);
  t.is(await done, 0);
  const expected = [
    'initializing dev',
    ' init dev ',
    'setting sim chain',
    'set-fake-chain',
    'start',
  ];
  t.is(world.logged.length, expected.length);
  expected.forEach((s, ix) => t.true(world.logged[ix].msg.includes(s)));
});
