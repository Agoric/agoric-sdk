import { test } from 'tape-promise/tape';
import { buildVatController } from '../src/index';

test('load', async t => {
  const config = {
    vatSources: {},
    wiringSource: '',
  };
  const controller = await buildVatController(config);
  controller.run();
  t.end();
});
