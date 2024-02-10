// @ts-check
import anyTest from 'ava';

// Use ambient authority only in test.before()
import { spawn as ambientSpawn } from 'child_process';
import * as ambientPath from 'path';

import { makeScenario2, pspawn } from './scenario2.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const makeTestContext = async t => {
  const filename = new URL(import.meta.url).pathname;
  const dirname = ambientPath.dirname(filename);
  const makefileDir = ambientPath.join(dirname, '..');

  const io = { spawn: ambientSpawn, cwd: makefileDir };
  const pspawnMake = pspawn('make', io);
  const pspawnAgd = pspawn('../../bin/agd', io);
  const scenario2 = makeScenario2({ pspawnMake, pspawnAgd, log: t.log });
  return { scenario2, pspawnAgd, pspawnMake };
};

test.before(async t => {
  t.context = await makeTestContext(t);
  await t.context.scenario2.setup();
});

test.serial('make and exec', async t => {
  // Note: the test harness discards the (voluminous) log messages
  // emitted by the kernel and vats. You can run `make scenario2-setup
  // scenario2-run-chain-to-halt` manually, to see them all.
  const { pspawnAgd, scenario2 } = t.context;
  t.log('exec agd');
  t.is(await pspawnAgd([]).exit, 0, 'exec agd exits successfully');
  t.log('run chain to halt');
  t.is(
    await scenario2.runToHalt(),
    0,
    'make scenario2-run-chain-to-halt is successful',
  );
  t.log('resume chain and halt');
  t.is(
    await scenario2.runToHalt(),
    0,
    'make scenario2-run-chain-to-halt succeeds again',
  );
  t.log('export');
  t.is(await scenario2.export(), 0, 'export exits successfully');
});
