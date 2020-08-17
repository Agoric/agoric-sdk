/* global harden */
import '@agoric/install-ses';
import path from 'path';
import { test } from 'tape-promise/tape';
import { buildVatController, loadSwingsetConfigFile } from '../../../src/index';

function capdata(body, slots = []) {
  return harden({ body, slots });
}

function capargs(args, slots = []) {
  return capdata(JSON.stringify(args), slots);
}

test('terminate', async t => {
  const configPath = path.resolve(__dirname, 'swingset-terminate.json');
  const config = loadSwingsetConfigFile(configPath);
  const controller = await buildVatController(config);
  t.equal(controller.bootstrapResult.status(), 'pending');
  await controller.run();
  t.equal(controller.bootstrapResult.status(), 'fulfilled');
  t.deepEqual(
    controller.bootstrapResult.resolution(),
    capargs('bootstrap done'),
  );
  t.deepEqual(controller.dump().log, [
    'FOO 1',
    'count1 FOO SAYS 1',
    'QUERY 2',
    'GOT QUERY 2',
    'ANSWER 2',
    'query2 2',
    'QUERY 3',
    'GOT QUERY 3',
    // these two will be added in phase 2
    // 'foreverP.catch (err??)',
    // 'afterForeverP.catch (err??)',
    'foo4P.catch vat is dead',
    // CHIP TODO phase 1.5, when done() is wired up
    // '(vat termination message????)',
  ]);
  t.end();
});
