import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
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
  const ldSrcPath = require.resolve('../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];

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
  t.deepEquals(dump.log, encouragementBotCommsGolden);
  t.end();
});

test('run encouragementBotCommsWavyDot Demo', async t => {
  const dump = await main('demo/encouragementBotCommsWavyDot', []);
  t.deepEquals(dump.log, encouragementBotCommsGolden);
  t.end();
});
