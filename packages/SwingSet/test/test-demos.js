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

const encouragementBotGolden = [
  '=> user.talkToBot is called with encouragementBot',
  '=> encouragementBot.encourageMe got the name: user',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

test('run encouragementBot Demo', async t => {
  const dump = await main(
    path.resolve(__dirname, '../demo/encouragementBot'),
    [],
  );
  t.deepEqual(dump.log, encouragementBotGolden);
});
