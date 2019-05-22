import path from 'path';
import { test } from 'tape-promise/tape';
import testLogs from './test-logs';
import { buildVatController, loadBasedir } from '../../src/index';

export async function runVats(t, withSES, argv) {
  const config = await loadBasedir(
    // TODO: move basedir-commsvat to ./ , since it isn't used anywhere else
    path.resolve(__dirname, '../basedir-commsvat'),
  );

  const ldSrcPath = require.resolve('../../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];
  const c = await buildVatController(config, withSES, argv);
  return c;
}

export function runTest(testStr) {
  test(testStr, async t => {
    const c = await runVats(t, false, [testStr]);
    await c.run();
    const { log } = c.dump();
    t.deepEqual(log, testLogs[testStr]);
    t.end();
  });
}

export function runTestOnly(testStr) {
  test.only(testStr, async t => {
    const c = await runVats(t, false, [testStr]);
    await c.run();
    const dump = c.dump();
    t.deepEqual(dump.log, testLogs[testStr]);
    t.end();
  });
}

export function runTestSkip(testStr) {
  test.skip(testStr, async t => {
    const c = await runVats(t, false, [testStr]);
    await c.run();
    const dump = c.dump();
    t.deepEqual(dump.log, testLogs[testStr]);
    t.end();
  });
}

export function stepTestOnly(testStr) {
  test.only(testStr, async t => {
    const c = await runVats(t, false, [testStr]);
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    await c.step();
    const dump = c.dump();
    t.deepEqual(dump.log, testLogs[testStr]);
    t.end();
  });
}
