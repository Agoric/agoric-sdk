import path from 'path';
import { test } from 'tape-promise/tape';
// import fs from 'fs';
import { buildVatController, loadBasedir } from '../src/index';
import stringify from '../src/kernel/json-stable-stringify';

async function buildTrace(c) {
  const states = [];
  while (c.dump().runQueue.length) {
    states.push(c.getState());
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(c.getState());
  return states;
}

async function testSaveState(t, withSES) {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );

  config.initialState = stringify({});
  const c1 = await buildVatController(config, withSES, ['one']);
  const states1 = await buildTrace(c1);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, s)
  ); */

  config.initialState = stringify({});
  const c2 = await buildVatController(config, withSES, ['one']);
  const states2 = await buildTrace(c2);

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
  config.initialState = stringify({});
  const c0 = await buildVatController(config, withSES, ['one']);
  const states = await buildTrace(c0);
  // states.forEach((s,j) =>
  //               fs.writeFileSync(`kdata-${j}.json`, states[j]));

  for (let i = 0; i < states.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await loadBasedir(
      path.resolve(__dirname, 'basedir-transcript'),
    );
    cfg.initialState = states[i];
    // eslint-disable-next-line no-await-in-loop
    const c = await buildVatController(cfg, withSES, ['one']);
    // eslint-disable-next-line no-await-in-loop
    const newstates = await buildTrace(c);
    // newstates.forEach((s,j) =>
    //                  fs.writeFileSync(`kdata-${i+j}-${i}+${j}.json`, newstates[j]));
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
