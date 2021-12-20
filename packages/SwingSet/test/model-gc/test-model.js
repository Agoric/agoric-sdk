// eslint-disable-next-line import/order
import { test } from '../../tools/prepare-test-env-ava.js';

import { buildVatController } from '../../src/index.js';

/*
cd packages/SwingSet && yarn test --verbose test/model-gc/test-model.js
*/

const script = {
  "init": [
    {
      "type": "initCreateVatRef",
      "vat": "vt0",
      "itemId": 0
    },
    {
      "type": "initGiveItem",
      "vat": "vt0",
      "itemId": 0
    }
  ],
  "transitions": [
    {
      "type": "transferControl",
      "actor": "boot",
      "targetVat": "vt1"
    },
    {
      "type": "storeSelfRef",
      "actor": "vt1",
      "awaits": [],
      "itemId": 1
    },
    {
      "type": "storeSelfRef",
      "actor": "vt1",
      "awaits": [],
      "itemId": 2
    },
    {
      "type": "transferControl",
      "actor": "boot",
      "awaits": [],
      "targetVat": "vt0"
    },
    {
      "type": "storeSelfRef",
      "actor": "vt0",
      "awaits": [],
      "itemId": 3
    },
    {
      "type": "transferControl",
      "actor": "boot",
      "awaits": [],
      "targetVat": "vt1"
    },
    {
      "type": "transferControl",
      "actor": "boot",
      "awaits": [],
      "targetVat": "vt0"
    },
    {
      "type": "transferControl",
      "actor": "boot",
      "awaits": [],
      "targetVat": "vt2"
    },
    {
      "type": "transferControl",
      "actor": "boot",
      "awaits": [],
      "targetVat": "vt1"
    }
  ],
  "actions": [
    "transferControl",
    "storeSelfRef",
    "storeSelfRef",
    "transferControl",
    "storeSelfRef",
    "transferControl",
    "transferControl",
    "transferControl",
    "transferControl"
  ]
}

test('check userspace', async t => {
  const config = {
    bootstrap: 'bootstrap',
    vats: {
      bootstrap: {
        sourceSpec: new URL('vat_bootstrap.js', import.meta.url).pathname,
        parameters: { script }
      },
      vt0: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname,
        parameters: { transitions: script.transitions }
      },
      vt1: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname,
        parameters: { transitions: script.transitions }
      },
      vt2: {
        sourceSpec: new URL('vat_model.js', import.meta.url).pathname,
        parameters: { transitions: script.transitions }
      },
    },
  };
  const c = await buildVatController(config, [{
    "[this is]": "argv[0]"
  }]);
  await c.run(); // start kernel, send bootstrap message, wait until halt
  const log = c.dump().log
  t.deepEqual(log, ['message one', 'message two']);
});
