// eslint-disable-next-line import/order
import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';

// import fs from 'fs';
import { buildVatController, loadBasedir } from '../src/index.js';

async function buildTrace(c, getAllState) {
  const states = [];
  while (c.dump().runQueue.length && c.dump().gcActions.length) {
    states.push(getAllState());
    // eslint-disable-next-line no-await-in-loop
    await c.step();
  }
  states.push(getAllState());
  await c.shutdown();
  return states;
}

test('transcript-one save', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage, debug } = initSwingStore();
  const c1 = await buildVatController(config, ['one'], {
    kernelStorage,
  });
  const states1 = await buildTrace(c1, debug.getAllState);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, JSON.stringify(s))
  ); */

  const config2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: kernelStorage2, debug: debug2 } = initSwingStore();
  const c2 = await buildVatController(config2, ['one'], {
    kernelStorage: kernelStorage2,
  });
  const states2 = await buildTrace(c2, debug2.getAllState);

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
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: s0, debug: d0 } = initSwingStore();
  const c0 = await buildVatController(config, ['one'], { kernelStorage: s0 });
  const states = await buildTrace(c0, d0.getAllState);
  // states.forEach((s,j) =>
  //               fs.writeFileSync(`kdata-${j}.json`,
  //                                JSON.stringify(states[j])));

  for (let i = 0; i < states.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const cfg = await loadBasedir(
      new URL('basedir-transcript', import.meta.url).pathname,
    );
    const { kernelStorage: s, debug: d } = initSwingStore();
    d.setAllState(states[i]);
    // eslint-disable-next-line no-await-in-loop
    const c = await buildVatController(cfg, ['one'], { kernelStorage: s });
    // eslint-disable-next-line no-await-in-loop
    const newstates = await buildTrace(c, d.getAllState);
    // newstates.forEach((s,j) =>
    //                  fs.writeFileSync(`kdata-${i+j}-${i}+${j}.json`,
    //                                   JSON.stringify(newstates[j])));
    t.deepEqual(states.slice(i), newstates);
  }
});
