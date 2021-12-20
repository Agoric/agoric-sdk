// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

import fs from 'fs';

/*
cd packages/SwingSet && yarn test --verbose test/model-gc/test-model.js
*/

test('check userspace', async t => {
  var traces;

  try {
    // traces = JSON.parse(fs.readFileSync("./traces/traces.json"));
    // traces = JSON.parse(fs.readFileSync("../../test/model-gc/traces.json"))
    traces = JSON.parse(fs.readFileSync("/Users/danwt/Documents/work/agoric-sdk-fork/packages/SwingSet/test/model-gc/traces.json"))
  } catch (err) {
    // handle your file not found (or other error) here
    console.log(`error reading file`, err);
  }


  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat_bootstrap.js', import.meta.url).pathname,
        parameters: { traces }
      },
      vt0: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname
      },
      vt1: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname
      },
      vt2: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname
      }
    },
  };

  const c = await buildVatController(config);
  try {
    await c.run(); // start kernel, send bootstrap message, wait until halt
  } catch (err) {
    const log = c.dump().log
    fs.writeFileSync('"/Users/danwt/Documents/work/agoric-sdk-fork/packages/SwingSet/test/model-gc/kerlog.json"', JSON.stringify(log), 'utf8');
    t.fail()
  }
  const log = c.dump().log
  fs.writeFileSync('"/Users/danwt/Documents/work/agoric-sdk-fork/packages/SwingSet/test/model-gc/kerlog.json"', JSON.stringify(log), 'utf8');
  t.deepEqual(log, ['message one', 'message two']);
});
