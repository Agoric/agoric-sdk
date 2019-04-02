import path from 'path';
import { test } from 'tape-promise/tape';
import fs from 'fs';
import { buildVatController, loadBasedir } from '../src/index';

async function testEThen(t, withSES) {
  const states = [];
  while (states.length < 2) {
    if (states.length === 0) {
      // eslint-disable-next-line no-await-in-loop
      const config = await loadBasedir(
        path.resolve(__dirname, 'basedir-transcript'),
      );
      // eslint-disable-next-line no-await-in-loop
      const c = await buildVatController(config, withSES, ['one']);
      states.push(c.getState());
    } else {
      // eslint-disable-next-line no-await-in-loop
      const config = await loadBasedir(
        path.resolve(__dirname, 'basedir-transcript'),
        states[states.length - 1],
      );
      // eslint-disable-next-line no-await-in-loop
      const c = await buildVatController(config, withSES, ['one']);
      // eslint-disable-next-line no-await-in-loop
      await c.step();
      states.push(c.getState());
    }
    fs.writeFileSync(
      `kdata-${states.length - 1}.json`,
      JSON.stringify(states[states.length - 1]),
    );
  }
  t.end();
}

test.skip('transcript-one with SES', async t => {
  await testEThen(t, true);
});

test.skip('transcript-one without SES', async t => {
  await testEThen(t, false);
});
