import { test } from 'tape-promise/tape';
import '../install-ses.js';
import path from 'path';
// import fs from 'fs';
import {
  initSwingStore,
  getAllState,
  setAllState,
} from '@agoric/swing-store-simple';
import { buildVatController, loadBasedir } from '../src/index';

async function buildTrace(c, storage) {
  const states = [];
  while (c.dump().runQueue.length) {
    states.push(getAllState(storage));
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(getAllState(storage));
  return states;
}

async function testSaveState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const { storage } = initSwingStore();
  config.hostStorage = storage;
  const c1 = await buildVatController(config, withSES, ['one']);
  const states1 = await buildTrace(c1, storage);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, JSON.stringify(s))
  ); */

  const storage2 = initSwingStore().storage;
  config.hostStorage = storage2;
  const c2 = await buildVatController(config, withSES, ['one']);
  const states2 = await buildTrace(c2, storage2);

  states1.forEach((s, i) => {
    t.deepEqual(s, states2[i]);
  });
  t.end();
}

test('transcript-one save with SES', async t => {
  await testSaveState(t, true);
});

async function testLoadState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const s0 = initSwingStore().storage;
  config.hostStorage = s0;
  const c0 = await buildVatController(config, withSES, ['one']);
  const states = await buildTrace(c0, s0);
  // states.forEach((s,j) =>
  //               fs.writeFileSync(`kdata-${j}.json`,
  //                                JSON.stringify(states[j])));

  for (let i = 0; i < states.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await loadBasedir(
      path.resolve(__dirname, 'basedir-transcript'),
    );
    const s = initSwingStore().storage;
    setAllState(s, states[i]);
    cfg.hostStorage = s;
    // eslint-disable-next-line no-await-in-loop
    const c = await buildVatController(cfg, withSES, ['one']);
    // eslint-disable-next-line no-await-in-loop
    const newstates = await buildTrace(c, s);
    // newstates.forEach((s,j) =>
    //                  fs.writeFileSync(`kdata-${i+j}-${i}+${j}.json`,
    //                                   JSON.stringify(newstates[j])));
    t.deepEqual(states.slice(i), newstates);
  }
  t.end();
}

test('transcript-one load with SES', async t => {
  await testLoadState(t, true);
});
