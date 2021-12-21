// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

import fs from 'fs';

/*
cd packages/SwingSet && yarn test --verbose test/model-gc/test-model.js
yarn test --verbose --timeout=120m test/model-gc/test-model.js
*/

const pathPrefix = "/Users/danwt/Documents/work/agoric-sdk-fork/packages/SwingSet/test/model-gc/"

test('check userspace', async t => {

  // The number of traces to check against a single kernel lifetime
  // before checking the log.
  const BATCH_SIZE = 100;

  let all_traces;

  try {
    all_traces = JSON.parse(fs.readFileSync(pathPrefix + "traces.json"))
  } catch (err) {
    console.log(`error reading traces.json file`, err);
    t.fail()
  }

  for (let i = 0; i < all_traces.length; i += BATCH_SIZE) {

    const traces = all_traces.slice(i, i + BATCH_SIZE);

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
      fs.writeFileSync(pathPrefix + 'kernel_log_dump.json', JSON.stringify(log), 'utf8');
      t.fail()
    }
    const log = c.dump().log
    fs.writeFileSync(pathPrefix + 'kernel_log_dump.json', JSON.stringify(log), 'utf8');

    function logArrIsValid(arr) {

      function correctNumberTerminations() {
        const TERMINATION_STR = "[vat_bootstrap trace complete]"
        const cnt = arr.reduce((acc, curr) => {
          curr == TERMINATION_STR ? acc + 1 : acc
        }, 0)
        return cnt == traces.length
      }

      function errorDetected() {
        const MATCH = ["err", "kernel", "panic"]
        return arr.some(
          str => MATCH.some(it => str.includes(it))
        )
      }

      return correctNumberTerminations && !errorDetected()
    }

    t.is(logArrIsValid(log), true);

  }

});
