/* eslint no-await-in-loop: "off" */
/* eslint dot-notation: "off" */
/* eslint object-shorthand: "off" */

import '@agoric/install-ses';
import test from 'ava';
import path from 'path';
import { buildVatController, loadBasedir } from '../src/index';
import { buildLoopbox } from '../src/devices/loopbox';
import { buildPatterns } from './message-patterns';

// This exercises all the patterns in 'message-patterns.js' twice (once with
// vatA/vatB connected directly through the kernel, and a second time with
// comms vats in the path). To enable/disable specific tests, run with e.g.
// 'yarn test test/test-message-patterns.js -m "test pattern a72 local"'
// or '-m "*a72 local"'

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

export async function runVatsLocally(t, name) {
  console.log(`------ testing pattern (local) -- ${name}`);
  const bdir = path.resolve(__dirname, 'basedir-message-patterns');
  const config = await loadBasedir(bdir);
  config.bootstrap = 'bootstrap';
  config.vats.bootstrap = { sourceSpec: path.join(bdir, 'bootstrap-local.js') };
  const c = await buildVatController(config, [name]);
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
  if (name === 'a51') {
    // TODO https://github.com/Agoric/agoric-sdk/issues/1631
    // eslint-disable-next-line no-continue
    continue;
  }
  test.serial('local patterns', testLocalPattern, name);
}

const commsSourcePath = require.resolve('../src/vats/comms');
const vatTPSourcePath = require.resolve('../src/vats/vat-tp');

export async function runVatsInComms(t, enablePipelining, name) {
  console.log(`------ testing pattern (comms) -- ${name}`);
  const enableSetup = true;
  const bdir = path.resolve(__dirname, 'basedir-message-patterns');
  const config = await loadBasedir(bdir);
  config.bootstrap = 'bootstrap';
  config.vats.bootstrap = { sourceSpec: path.join(bdir, 'bootstrap-comms.js') };
  config.vats.leftcomms = {
    sourceSpec: commsSourcePath,
    creationOptions: {
      enablePipelining,
      enableSetup,
    },
  };
  config.vats.rightcomms = {
    sourceSpec: commsSourcePath,
    creationOptions: {
      enablePipelining,
      enableSetup,
    },
  };
  config.vats.leftvattp = { sourceSpec: vatTPSourcePath };
  config.vats.rightvattp = { sourceSpec: vatTPSourcePath };
  const { passOneMessage, loopboxSrcPath, loopboxEndowments } = buildLoopbox(
    'queued',
  );
  config.devices = [['loopbox', loopboxSrcPath, loopboxEndowments]];
  const c = await buildVatController(config, [name]);
  // await runWithTrace(c);
  await c.run();
  while (passOneMessage()) {
    await c.run();
  }
  console.log(`bootstrapResult`, c.bootstrapResult.status());
  return c.dump().log;
}

async function testCommsPattern(t, name) {
  const enablePipelining = true;
  const logs = await runVatsInComms(t, enablePipelining, name);
  let expected;
  if (enablePipelining && name in bp.expected_pipelined) {
    expected = bp.expected_pipelined[name];
  } else {
    expected = bp.expected[name];
  }
  t.deepEqual(logs, expected);
}
testCommsPattern.title = (_, name) => `test pattern ${name} comms`;
for (const name of Array.from(bp.patterns.keys()).sort()) {
  // TODO https://github.com/Agoric/agoric-sdk/issues/1631
  test.serial('comms patterns', testCommsPattern, name);
}
