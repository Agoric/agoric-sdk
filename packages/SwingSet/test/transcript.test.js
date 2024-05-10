import { test } from '../tools/prepare-test-env-ava.js';
// eslint-disable-next-line import/order
import { initSwingStore } from '@agoric/swing-store';

// import fs from 'fs';
import { buildVatController, loadBasedir } from '../src/index.js';

async function buildTrace(c, debug) {
  const states = []; // list of { dump, serialized }
  while (c.dump().runQueue.length && c.dump().gcActions.length) {
    states.push({ dump: debug.dump(), serialized: debug.serialize() });
    await c.step();
  }
  states.push({ dump: debug.dump(), serialized: debug.serialize() });
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
  const states1 = await buildTrace(c1, debug);
  /*
  states1.forEach( (s, i) =>
    fs.writeFileSync(`kdata-${i}.json`, JSON.stringify(s.dump))
  ); */

  const config2 = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: kernelStorage2, debug: debug2 } = initSwingStore();
  const c2 = await buildVatController(config2, ['one'], {
    kernelStorage: kernelStorage2,
  });
  const states2 = await buildTrace(c2, debug2);

  for (const [i, s] of states1.entries()) {
    t.deepEqual(s.dump, states2[i].dump);
  }
});

test('transcript-one load', async t => {
  const config = await loadBasedir(
    new URL('basedir-transcript', import.meta.url).pathname,
  );
  const { kernelStorage: s0, debug: d0 } = initSwingStore();
  const c0 = await buildVatController(config, ['one'], { kernelStorage: s0 });
  const states = await buildTrace(c0, d0);
  // states.forEach((s,j) =>
  //               fs.writeFileSync(`kdata-${j}.json`,
  //                                JSON.stringify(states[j].dump)));

  for (let i = 0; i < states.length; i += 1) {
    const cfg = await loadBasedir(
      new URL('basedir-transcript', import.meta.url).pathname,
    );
    const { serialized } = states[i];
    const { kernelStorage: s, debug: d } = initSwingStore(null, { serialized });
    const c = await buildVatController(cfg, ['one'], { kernelStorage: s });
    const newstates = await buildTrace(c, d);
    // newstates.forEach((s,j) =>
    //                  fs.writeFileSync(`kdata-${i+j}-${i}+${j}.json`,
    //                                   JSON.stringify(newstates[j].dump)));
    t.deepEqual(states.slice(i), newstates);
  }
});
