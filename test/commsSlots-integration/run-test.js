import path from 'path';
import { test } from 'tape-promise/tape';
import testLogs from './test-logs';
import { buildVatController, loadBasedir } from '../../src/index';
import { buildChannel } from '../../src/devices';

export async function runVats(t, withSES, argv) {
  const config = await loadBasedir(
    path.resolve(__dirname, '../basedir-commsvat'),
  );

  const channelDevice = buildChannel();
  const vatDevices = new Map();
  const commsConfig = {
    devices: {
      channel: {
        attenuatorSource: channelDevice.attenuatorSource,
        bridge: channelDevice.bridge,
      },
    },
  };

  for (const vatID of config.vatSources.keys()) {
    if (vatID.endsWith('comms')) {
      vatDevices.set(vatID, commsConfig);
    }
  }

  if (vatDevices.size > 0) {
    config.vatDevices = vatDevices;
  }
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
