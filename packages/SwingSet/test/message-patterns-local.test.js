// @ts-nocheck
/* eslint no-await-in-loop: "off" */
/* eslint dot-notation: "off" */
/* eslint object-shorthand: "off" */

// eslint-disable-next-line import/order -- has side-effects AND exports
import { test } from '../tools/prepare-test-env-ava.js';

import path from 'path';
import bundleSource from '@endo/bundle-source';
import { initSwingStore } from '@agoric/swing-store';
import {
  initializeSwingset,
  makeSwingsetController,
  buildKernelBundles,
} from '../src/index.js';
import { bundleOpts } from './util.js';
import { buildPatterns } from './message-patterns.js';

// This exercises all the patterns in 'message-patterns.js' with
// vatA/vatB connected directly through the kernel (a different file
// runs them all a second time with comms vats in the path). To
// enable/disable specific tests, run with e.g.  'yarn test
// test/message-patterns.test.js -m "test pattern a72 local"' or '-m
// "*a72 local"'

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

  t.context.data = { localConfig, kernelBundles };
});

export async function runVatsLocally(t, name) {
  const { localConfig } = t.context.data;
  const { initOpts, runtimeOpts } = bundleOpts(t.context.data);
  const { kernelStorage, hostStorage } = initSwingStore();
  t.teardown(hostStorage.close);
  await initializeSwingset(localConfig, [name], kernelStorage, initOpts);
  const c = await makeSwingsetController(kernelStorage, {}, runtimeOpts);
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
