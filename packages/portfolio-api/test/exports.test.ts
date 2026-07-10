import '@endo/init/debug.js';

import test from 'ava';

import * as index from '@agoric/portfolio-api';
import * as eip712Messages from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import * as messageHandlerHelpers from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import * as prodNetwork from '@agoric/portfolio-api/src/network/prod-network.js';
import * as targetBalances from '@agoric/portfolio-api/src/target-balances.js';

test('index', t => {
  t.snapshot(Object.keys(index).sort());
});

test('subpath exports', t => {
  t.snapshot({
    eip712Messages: Object.keys(eip712Messages).sort(),
    messageHandlerHelpers: Object.keys(messageHandlerHelpers).sort(),
    prodNetwork: Object.keys(prodNetwork).sort(),
    targetBalances: Object.keys(targetBalances).sort(),
  });
});
