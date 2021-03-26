/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import { initSwingStore } from '@agoric/swing-store-simple';
import path from 'path';
import { buildLoopbox } from '../src/devices/loopbox';
import {
  loadBasedir,
  initializeSwingset,
  makeSwingsetController,
} from '../src/index';

async function main(basedir, argv) {
  const config = await loadBasedir(basedir);
  const enableSetup = true;
  if (config.vats.botcomms) {
    config.vats.botcomms.creationOptions = { enableSetup };
  }
  if (config.vats.usercomms) {
    config.vats.usercomms.creationOptions = { enableSetup };
  }
  const { loopboxSrcPath, loopboxEndowments } = buildLoopbox('immediate');
  config.devices = {
    loopbox: {
      sourceSpec: loopboxSrcPath,
    },
  };
  const deviceEndowments = {
    loopbox: { ...loopboxEndowments },
  };

  const storage = initSwingStore().storage;
  await initializeSwingset(config, argv, storage);
  const controller = await makeSwingsetController(storage, deviceEndowments);

  await controller.run();
  return controller.dump();
}

const encouragementBotCommsGolden = [
  '=> user.talkToBot is called with bot',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> encouragementBot.encourageMe got the name: user',
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

test('run encouragementBotComms Demo', async t => {
  const dump = await main(
    path.resolve(__dirname, '../demo/encouragementBotComms'),
    [],
  );
  t.deepEqual(dump.log, encouragementBotCommsGolden);
});

test('run encouragementBotCommsWavyDot Demo', async t => {
  const dump = await main(
    path.resolve(__dirname, '../demo/encouragementBotCommsWavyDot'),
    [],
  );
  t.deepEqual(dump.log, encouragementBotCommsGolden);
});
