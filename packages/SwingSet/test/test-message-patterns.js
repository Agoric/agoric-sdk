/* eslint no-await-in-loop: "off" */
/* eslint dot-notation: "off" */
/* eslint object-shorthand: "off" */

// `test.serial` does not yet seem compatible with ses-ava
// See https://github.com/endojs/endo/issues/647
// TODO restore
// import { test } from '../tools/prepare-test-env-ava.js';
import '../tools/prepare-test-env.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import path from 'path';
import bundleSource from '@endo/bundle-source';
import { provideHostStorage } from '../src/hostStorage.js';
import {
  initializeSwingset,
  makeSwingsetController,
  buildVatController,
  buildKernelBundles,
} from '../src/index.js';
import { buildLoopbox } from '../src/devices/loopbox.js';
import { buildPatterns } from './message-patterns.js';

// This exercises all the patterns in 'message-patterns.js' twice (once with
// vatA/vatB connected directly through the kernel, and a second time with
// comms vats in the path). To enable/disable specific tests, run with e.g.
// 'yarn test test/test-message-patterns.js -m "test pattern a72 local"'
// or '-m "*a72 local"'

// See message-patterns.js for details.

// eslint-disable-next-line no-unused-vars
async function runWithTrace(c) {
  let count = 0;
  while (c.dump().runQueue.length) {
    console.log('-');
    console.log(`--- turn starts`, count);
    count += 1;
    await c.step();
    // console.log(c.dump().kernelTable);
    for (const q of c.dump().runQueue) {
      if (q.type === 'send') {
        console.log(
          ` send ${q.msg.result} = ${q.target}!${
            q.msg.method
          }(${q.msg.args.slots.join(',')} ${q.msg.args.body})`,
        );
      } else if (q.type === 'notify') {
        console.log(` notify ${q.vatID}: ${q.kpid}`);
      }
    }
  }
}

test.before(async t => {
  const kernelBundles = await buildKernelBundles();
  const bdir = new URL('basedir-message-patterns', import.meta.url).pathname;
  const bundleA = await bundleSource(path.resolve(bdir, 'vat-a.js'));
  const bundleB = await bundleSource(path.resolve(bdir, 'vat-b.js'));
  const bundleC = await bundleSource(path.resolve(bdir, 'vat-c.js'));

  const bootstrapLocal = path.resolve(bdir, 'bootstrap-local.js');
  const bundleLocal = await bundleSource(bootstrapLocal);
  const localConfig = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: { bundle: bundleLocal },
      a: { bundle: bundleA },
      b: { bundle: bundleB },
      c: { bundle: bundleC },
    },
  };

  const bootstrapComms = path.resolve(bdir, 'bootstrap-comms.js');
  const bundleComms = await bundleSource(bootstrapComms);
  const moreComms = {
    bundle: kernelBundles.comms,
    creationOptions: {
      enablePipelining: true,
      enableSetup: true,
      managerType: 'local',
      useTranscript: false,
    },
  };
  const moreVatTP = { bundle: kernelBundles.vattp };
  const commsConfig = {
    bootstrap: 'bootstrap',
    defaultReapInterval: 'never',
    vats: {
      bootstrap: { bundle: bundleComms },
      a: { bundle: bundleA },
      b: { bundle: bundleB },
      c: { bundle: bundleC },
      commsA: { ...moreComms, parameters: { identifierBase: 100 } },
      commsB: { ...moreComms, parameters: { identifierBase: 200 } },
      commsC: { ...moreComms, parameters: { identifierBase: 300 } },
      vattpA: moreVatTP,
      vattpB: moreVatTP,
      vattpC: moreVatTP,
    },
  };

  t.context.data = { localConfig, commsConfig, kernelBundles };
});

export async function runVatsLocally(t, name) {
  const { localConfig: config, kernelBundles } = t.context.data;
  const c = await buildVatController(config, [name], {
    kernelBundles,
  });
  t.teardown(c.shutdown);
  // await runWithTrace(c);
  await c.run();
  return c.dump().log;
}

const bp = buildPatterns();
async function testLocalPattern(t, name) {
  const logs = await runVatsLocally(t, name);
  t.deepEqual(logs, bp.expected[name]);
}
testLocalPattern.title = (_, name) => `test pattern ${name} local`;
for (const name of Array.from(bp.patterns.keys()).sort()) {
  test.serial('local patterns', testLocalPattern, name);
}

export async function runVatsInComms(t, name) {
  const { commsConfig, kernelBundles } = t.context.data;
  const { passOneMessage, loopboxSrcPath, loopboxEndowments } = buildLoopbox(
    'queued',
  );
  const devices = {
    loopbox: {
      sourceSpec: loopboxSrcPath,
      parameters: {
        senders: ['A', 'B', 'C'],
      },
    },
  };
  const config = { ...commsConfig, devices };
  const deviceEndowments = {
    loopbox: { ...loopboxEndowments },
  };
  const hostStorage = provideHostStorage();
  await initializeSwingset(config, [name], hostStorage, { kernelBundles });
  const c = await makeSwingsetController(hostStorage, deviceEndowments);
  t.teardown(c.shutdown);

  // await runWithTrace(c);
  await c.run();
  while (passOneMessage()) {
    await c.run();
  }
  return c.dump().log;
}

async function testCommsPattern(t, name) {
  const logs = await runVatsInComms(t, name);
  let expected;
  if (name in bp.expected_pipelined) {
    expected = bp.expected_pipelined[name];
  } else {
    expected = bp.expected[name];
  }
  t.deepEqual(logs, expected);
}
testCommsPattern.title = (_, name) => `test pattern ${name} comms`;
for (const name of Array.from(bp.patterns.keys()).sort()) {
  test.serial('comms patterns', testCommsPattern, name);
}
