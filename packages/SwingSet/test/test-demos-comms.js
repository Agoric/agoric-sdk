import '@agoric/install-ses';
import test from 'ava';
import { buildLoopbox } from '../src/devices/loopbox';
import { loadBasedir, buildVatController } from '../src/index';

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
  config.devices = [['loopbox', loopboxSrcPath, loopboxEndowments]];

  const controller = await buildVatController(config, argv);
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
  const dump = await main('demo/encouragementBotComms', []);
  t.deepEqual(dump.log, encouragementBotCommsGolden);
});

test('run encouragementBotCommsWavyDot Demo', async t => {
  const dump = await main('demo/encouragementBotCommsWavyDot', []);
  t.deepEqual(dump.log, encouragementBotCommsGolden);
});
