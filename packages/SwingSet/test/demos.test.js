import { test } from '../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';
import { buildLoopbox } from '../src/devices/loopbox/loopbox.js';
import {
  loadBasedir,
  initializeSwingset,
  makeSwingsetController,
} from '../src/index.js';

async function main(basedir, argv) {
  const config = await loadBasedir(basedir);
  const { loopboxSrcPath, loopboxEndowments } = buildLoopbox('immediate');

  config.devices = {
    loopbox: {
      sourceSpec: loopboxSrcPath,
      parameters: {
        senders: ['user', 'bot'],
      },
    },
  };
  const deviceEndowments = {
    loopbox: { ...loopboxEndowments },
  };

  const kernelStorage = initSwingStore().kernelStorage;
  await initializeSwingset(config, argv, kernelStorage);
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
  );
  await controller.run();
  const res = controller.dump();
  await controller.shutdown();
  return res;
}

const encouragementBotGolden = [
  '=> user.talkToBot is called with encouragementBot',
  '=> encouragementBot.encourageMe got the name: user',
  "=> the promise given by the call to user.talkToBot resolved to 'Thanks for the setup. I sure hope I get some encouragement...'",
  '=> user receives the encouragement: user, you are awesome, keep it up!',
];

test('run encouragementBot Demo', async t => {
  const dump = await main(
    new URL('../demo/encouragementBot', import.meta.url).pathname,
    [],
  );
  t.deepEqual(dump.log, encouragementBotGolden);
});
