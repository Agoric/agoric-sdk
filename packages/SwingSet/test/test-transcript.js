/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import path from 'path';
// import fs from 'fs';
import { getAllState, setAllState } from '@agoric/swing-store-simple';
import { provideHostStorage } from '../src/hostStorage';
import { buildVatController, loadBasedir } from '../src/index';

async function buildTrace(c, storage) {
  const states = [];
  while (c.dump().runQueue.length && c.dump().gcActions.length) {
    states.push(getAllState(storage));
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(getAllState(storage));
  await c.shutdown();
  return states;
}

test('transcript-one save', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  // config.defaultManagerType = 'xs-worker';
  const hostStorage = provideHostStorage();
  // try {
  //   fs.rmSync('kdata-one-save-s1.slog');
  // } catch (e) {}
  // try {
  //   fs.rmSync('kdata-one-save-s2.slog');
  // } catch (e) {}
  const c1 = await buildVatController(config, ['one'], {
    hostStorage,
    // slogFile: 'kdata-one-save-s1.slog',
  });
  const states1 = await buildTrace(c1, hostStorage);

  // states1.forEach( (s, i) =>
  //   fs.writeFileSync(`kdata-one-save-s1-${i}.json`, JSON.stringify(s))
  // );

  const config2 = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  // config2.defaultManagerType = 'xs-worker';
  const hostStorage2 = provideHostStorage();
  const c2 = await buildVatController(config2, ['one'], {
    hostStorage: hostStorage2,
    // slogFile: 'kdata-one-save-s2.slog',
  });
  const states2 = await buildTrace(c2, hostStorage2);

  // states2.forEach( (s, i) =>
  //   fs.writeFileSync(`kdata-one-save-s2-${i}.json`, JSON.stringify(s))
  // );

  states1.forEach((s, i) => {
    // Too expensive!  If there is a difference in the 3MB data, AVA will spin
    // for a long time trying to compute a "minimal" diff.
    // t.deepEqual(s, states2[i]);

    // Instead, we just do simple comparison.  Leave investigation to the
    // experts.
    const s2 = states2[i];
    const extra = new Set(Object.keys(s2.kvStuff));
    for (const k of Object.keys(s.kvStuff)) {
      t.assert(s.kvStuff[k] === s2.kvStuff[k], `states[${i}][${k}] differs`);
      extra.delete(k);
    }
    t.deepEqual([...extra.keys()], [], `states2[${i}] has missing keys`);
    t.deepEqual(s.streamStuff, s2.streamStuff);
  });
});

test('transcript-one load', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  // config.defaultManagerType = 'xs-worker';
  const s0 = provideHostStorage();
  // try {
  //   fs.rmSync('kdata-one-load-sN.slog');
  // } catch (e) {}
  const c0 = await buildVatController(config, ['one'], {
    hostStorage: s0,
    // slogFile: 'kdata-one-load-sN.slog',
  });
  const states = await buildTrace(c0, s0);
  // states.forEach((s,j) =>
  //   fs.writeFileSync(`kdata-one-load-${j}.json`,
  //                    JSON.stringify(states[j])));

  for (let i = 0; i < states.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await loadBasedir(
      path.resolve(__dirname, 'basedir-transcript'),
    );
    // cfg.defaultManagerType = 'xs-worker';
    const s = provideHostStorage();
    setAllState(s, states[i]);
    // eslint-disable-next-line no-await-in-loop
    const c = await buildVatController(cfg, ['one'], {
      hostStorage: s,
      // slogFile: path.resolve(__dirname, `kdata-one-load-s${i}.slog`),
    });
    // eslint-disable-next-line no-await-in-loop
    const newstates = await buildTrace(c, s);
    // newstates.forEach((s,j) =>
    //   fs.writeFileSync(`kdata-one-load-${i+j}-${i}+${j}.json`,
    //                    JSON.stringify(newstates[j])));
    t.deepEqual(states.slice(i), newstates);
  }
});
