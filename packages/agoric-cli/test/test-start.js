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

  /** @type {typeof import('path')} */
  // @ts-expect-error cast
  const path = {
    resolve: (...parts) => parts.join('/'), // how far can we get with this?
  };

  const dbg = x => {
    console.log('@@@', x);
    return x;
  };
  const anyStats = /** @type {any} */ ({});
  /** @type {typeof import('fs/promises')} */
  // @ts-expect-error cast
  const fs = {
    stat: async file =>
      files.has(file) ? anyStats : assert.fail('no such file'),
  };

  /** @type {typeof import('fs')} */
  // @ts-expect-error cast
  const fsSync = { promises: fs };

  /** @type {Record<string, (args: string[]) => number> } */
  const programs = {
    rm: args => {
      if (args[0] && args[0].startsWith('-')) args.shift();
      const [target] = args;
      for (const p of files.keys()) {
        if (p.startsWith(target)) {
          files.delete(p);
        }
      }
      return 0;
    },
  };

  const running = new Map();

  const doExit = (pid, code) => {
    const cp = running.get(pid);
    running.delete(pid);
    for (const h of cp.handlers.get('exit')) {
      t.log('exit', pid, h);
      h(code);
    }
  };

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

    const impl = programs[cmd];
    if (impl) {
      Promise.resolve(null).then(() => {
        const code = impl(args);
        doExit(cp.pid, code);
      });
    }

    return cp;
  };

  const runChildren = async (delay, dur = 250) => {
    for (;;) {
      await delay(dur);
      // t.log('runChildren', running.size);
      const { done, value: pid } = running.keys().next();
      // eslint-disable-next-line no-continue
      if (done) continue;
      doExit(pid, 0);
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

  return { anylogger, logged, path, fs, fsSync, spawn, runChildren, process };
};

/**
 *
 * @param {*} t
 * @param {{msg: string}[]} logged
 * @param {RegExp[]} expected
 */
const checkLog = (t, logged, expected) => {
  expected.forEach((pat, ix) => t.regex(logged[ix].msg, pat));
  t.is(logged.length, expected.length);
};

test('agoric start - no install', async t => {
  const world = makeScenario(t, new Map());
  const done = startMain('agoric', ['start'], world, {
    ...t.context.agoricOpts,
    restart: true,
  });
  world.runChildren(makeDelay(t.context.setTimeout), 50);
  t.is(await done, 1);
  checkLog(t, world.logged, [/you must first run/]);
});

test('agoric start - installed', async t => {
  const world = makeScenario(
    t,
    new Map(
      Object.entries({
        './node_modules/@agoric/solo': {},
      }),
    ),
  );
  const done = startMain('agoric', ['start'], world, {
    ...t.context.agoricOpts,
    restart: true,
  });
  world.runChildren(makeDelay(t.context.setTimeout), 50);
  const code = await done;
  checkLog(t, world.logged, [
    /initializing dev/,
    / init dev /,
    /setting sim chain/,
    /set-fake-chain/,
    /start/,
  ]);
  t.is(code, 0);
});

test('agoric start - reset', async t => {
  const world = makeScenario(
    t,
    new Map(
      Object.entries({
        './node_modules/@agoric/solo': {},
      }),
    ),
  );
  const done = startMain('agoric', ['start'], world, {
    ...t.context.agoricOpts,
    restart: true,
    reset: true,
  });
  world.runChildren(makeDelay(t.context.setTimeout), 50);
  const code = await done;
  checkLog(t, world.logged, [
    /removing .*_agstate.agoric-servers.dev/,
    /rm -rf/,
    /initializing dev/,
    / init dev /,
    /setting sim chain/,
    /set-fake-chain/,
    /start/,
  ]);
  t.is(code, 0);
});
