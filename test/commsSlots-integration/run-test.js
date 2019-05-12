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
  await c.run();
  const { log } = c.dump();
  return log;
}

export function runTest(testStr) {
  test(testStr, async t => {
    const log = await runVats(t, false, [testStr]);
    t.deepEqual(log, testLogs[testStr]);
    t.end();
  });
}

export function runTestOnly(testStr) {
  test.only(testStr, async t => {
    const log = await runVats(t, false, [testStr]);
    t.deepEqual(log, testLogs[testStr]);
    t.end();
  });
}
