/* global __dirname */
import { test } from '../tools/prepare-test-env-ava';

// eslint-disable-next-line import/order
import path from 'path';
import { provideHostStorage } from '../src/hostStorage';
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

  const hostStorage = provideHostStorage();
  await initializeSwingset(config, argv, hostStorage);
  const controller = await makeSwingsetController(
    hostStorage,
    deviceEndowments,
  );

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
