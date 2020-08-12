import '@agoric/install-ses';
import test from 'ava';
import { loadBasedir, buildVatController } from '../src/index';

async function main(basedir, argv) {
  const config = await loadBasedir(basedir);
  const ldSrcPath = require.resolve('../src/devices/loopbox-src');
  config.devices = [['loopbox', ldSrcPath, {}]];

  const controller = await buildVatController(config, argv);
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
  const dump = await main('demo/encouragementBot', []);
  t.deepEqual(dump.log, encouragementBotGolden);
 return; // t.end();
});
