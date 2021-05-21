/* global __dirname */
// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava';

import path from 'path';
// import fs from 'fs';
import { getAllState, setAllState } from '@agoric/swing-store-simple';
import { provideHostStorage } from '../src/hostStorage';
import { buildVatController, loadBasedir } from '../src/index';

async function buildTrace(c, storage) {
  // XXX TODO also copy transcript
  const states = [];
  while (c.dump().runQueue.length) {
    states.push(getAllState(storage.kvStore));
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(getAllState(storage.kvStore));
  return states;
}

test('transcript-one save', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const hostStorage = provideHostStorage();
  const c1 = await buildVatController(config, ['one'], {
    hostStorage,
  });
  const states1 = await buildTrace(c1, hostStorage);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, JSON.stringify(s))
  ); */

  const config2 = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const hostStorage2 = provideHostStorage();
  const c2 = await buildVatController(config2, ['one'], {
    hostStorage: hostStorage2,
  });
  const states2 = await buildTrace(c2, hostStorage2);

  states1.forEach((s, i) => {
    // Too expensive!  If there is a difference in the 3MB data, AVA will spin
    // for a long time trying to compute a "minimal" diff.
    // t.deepEqual(s, states2[i]);

    // Instead, we just do simple comparison.  Leave investigation to the
    // experts.
    const s2 = states2[i];
    const extra = new Set(Object.keys(s2));
    for (const k of Object.keys(s)) {
      t.assert(s[k] === s2[k], `states[${i}][${k}] differs`);
      extra.delete(k);
    }
    t.deepEqual([...extra.keys()], [], `states2[${i}] has missing keys`);
  });
});

test('transcript-one load', async t => {
  const config = await loadBasedir(
    path.resolve(__dirname, 'basedir-transcript'),
  );
  const s0 = provideHostStorage();
  const c0 = await buildVatController(config, ['one'], { hostStorage: s0 });
  const states = await buildTrace(c0, s0);
  // states.forEach((s,j) =>
  //               fs.writeFileSync(`kdata-${j}.json`,
  //                                JSON.stringify(states[j])));

  for (let i = 0; i < states.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await loadBasedir(
      path.resolve(__dirname, 'basedir-transcript'),
    );
    const s = provideHostStorage();
    setAllState(s.kvStore, states[i]);
    // eslint-disable-next-line no-await-in-loop
    const c = await buildVatController(cfg, ['one'], { hostStorage: s });
    // eslint-disable-next-line no-await-in-loop
    const newstates = await buildTrace(c, s);
    // newstates.forEach((s,j) =>
    //                  fs.writeFileSync(`kdata-${i+j}-${i}+${j}.json`,
    //                                   JSON.stringify(newstates[j])));
    t.deepEqual(states.slice(i), newstates);
  }
});
