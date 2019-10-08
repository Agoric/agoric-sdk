import path from 'path';
import { test } from 'tape-promise/tape';
// import fs from 'fs';
import { buildVatController, loadBasedir } from '../src/index';
import { buildStorageInMemory } from '../src/hostStorage';

async function buildTrace(c, storage) {
  const states = [];
  while (c.dump().runQueue.length) {
    states.push(storage.getState());
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(storage.getState());
  return states;
}

async function testSaveState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const storage = buildStorageInMemory();
  config.hostStorage = storage.storage;
  const c1 = await buildVatController(config, withSES, ['one']);
  const states1 = await buildTrace(c1, storage);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, JSON.stringify(s))
  ); */

  const storage2 = buildStorageInMemory();
  config.hostStorage = storage2.storage;
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

test('transcript-one save without SES', async t => {
  await testSaveState(t, false);
});

async function testLoadState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const s0 = buildStorageInMemory();
  config.hostStorage = s0.storage;
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
    const s = buildStorageInMemory(states[i]);
    cfg.hostStorage = s.storage;
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

test('transcript-one load without SES', async t => {
  await testLoadState(t, false);
});
