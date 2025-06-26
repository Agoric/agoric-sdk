/* global setTimeout */

import {
  agd,
  evalBundles,
  passCoreEvalProposal,
  GOV1ADDR,
} from '@agoric/synthetic-chain';
import test from 'ava';
import fs from 'node:fs/promises';
import path from 'node:path';
import { retryUntilCondition } from '@agoric/client-utils';
import { encodeAddressHook } from '@agoric/cosmic-proto/address-hooks.js';

const SUBMISSION_DIR = 'test/localchaintest-submission';

/** @param {string} nodeName */
const readPublished = async nodeName => {
  const { value } = await agd.query(
    'vstorage',
    'data',
    '--output',
    'json',
    `published.${nodeName}`,
  );
  if (value === '') {
    return undefined;
  }
  const obj = JSON.parse(value);
  return obj.values.at(-1);
};

/**
 * @param {{
 *   testMoreBoardId: string,
 *   toAddress: string,
 *   amount: { ubld: string }
 * }} params
 */
const makeSendToScript = params => {
  const E = obj => obj;

  const scriptFn = async ({ consume: { board } }) => {
    console.log('=== localchain testMore started');
    console.log('=== localchain testMore params', params);

    const { testMoreBoardId, toAddress, amount } = params;

    console.log('=== localchain testMore get object', testMoreBoardId);

    const testMore = await E(board).getValue(testMoreBoardId);
    console.log('=== localchain testMore sendTo', toAddress, 'amount', amount);
    await E(testMore).sendTo(toAddress, amount);
    console.log('=== localchain testMore done');
  };

  return `const params = ${JSON.stringify(params)};
${scriptFn.toString()};`;
};

// The testing assertions are in the submission that runs in the core-eval.
// The test here runs that and confirms the eval made it through all the assertions.
test(`localchain passes tests`, async t => {
  await evalBundles(SUBMISSION_DIR);

  const nodePath = 'test.localchain';

  const actualValue = await retryUntilCondition(
    async () => readPublished(nodePath),
    value => {
      if (!value) {
        return false;
      }
      const result = JSON.parse(value);
      return result.status === 'fulfilled' && result.value?.senderAddress;
    },
    'core eval not processed yet',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.log('actualValue', actualValue);

  /** @type {PromiseSettledResult<any>} */
  const result = JSON.parse(actualValue);

  t.log('result', result);
  const status = result?.status;
  t.is(status, 'fulfilled', `core eval did not fulfill: ${actualValue}`);
  assert.equal(status, 'fulfilled');
  const senderAddress = result?.value?.senderAddress;
  const receiverAddress = result?.value?.receiverAddress;
  const testMoreBoardId = result?.value?.testMoreBoardId;

  t.is(
    typeof senderAddress,
    'string',
    `senderAddress is not a string: ${senderAddress}`,
  );

  t.is(
    typeof receiverAddress,
    'string',
    `receiverAddress is not a string: ${receiverAddress}`,
  );

  const bankSend = (fromAddr, toAddr, coins) =>
    agd.tx(
      '--chain-id=agoriclocal',
      '--keyring-backend=test',
      'bank',
      'send',
      fromAddr,
      toAddr,
      coins,
      '--yes',
    );

  const denomRecord = coins => {
    const record = {};
    for (const { denom, amount } of coins) {
      if (denom in record) {
        const oldAmount = BigInt(record[denom]);
        record[denom] = `${oldAmount + BigInt(amount)}`;
      } else {
        record[denom] = amount;
      }
    }
    return record;
  };

  const bankBalances = async (address, priorBalances = {}) => {
    const { balances } = await agd.query(
      'bank',
      'balances',
      address,
      '--output',
      'json',
    );
    const balanceRecord = denomRecord(balances);

    const priorBalanceKeys = new Set(Object.keys(priorBalances));
    const delta = {};
    for (const [denom, amount] of Object.entries(balanceRecord)) {
      const priorAmount = BigInt(priorBalances[denom] || '0');
      priorBalanceKeys.delete(denom);
      const newDelta = `${BigInt(amount) - priorAmount}`;
      if (newDelta !== '0') {
        delta[denom] = newDelta;
      }
    }
    for (const denom of priorBalanceKeys) {
      delta[denom] = `-${priorBalances[denom]}`;
    }
    return { balances: balanceRecord, delta };
  };

  const { balances: balances0 } = await bankBalances(senderAddress);
  await bankSend(GOV1ADDR, senderAddress, '37ubld');
  const { balances: balances1, delta: delta1 } = await bankBalances(
    senderAddress,
    balances0,
  );

  t.deepEqual(
    delta1,
    { ubld: '37' },
    `expected 37ubld added to ${senderAddress} but got ${JSON.stringify(delta1)}`,
  );

  t.log('sending to address hook from LCA');
  const addressHook = encodeAddressHook(receiverAddress, {
    lovely: 'localchaintest',
  });

  const sendTo = async (toAddress, amount) => {
    const sendToScript = makeSendToScript({
      testMoreBoardId,
      toAddress,
      amount,
    });

    const scriptPath = path.join(SUBMISSION_DIR, 'testMore.js');
    await fs.writeFile(scriptPath, sendToScript);
    const permitPath = path.join(SUBMISSION_DIR, 'testMore-permit.json');
    await fs.writeFile(
      permitPath,
      JSON.stringify({ consume: { board: 'execute' } }),
    );
    await passCoreEvalProposal([
      {
        name: 'lca-send',
        dir: SUBMISSION_DIR,
        bundles: [],
        evals: [{ permit: 'testMore-permit.json', script: 'testMore.js' }],
      },
    ]);

    const sentValue = await retryUntilCondition(
      async () => readPublished(nodePath),
      value => {
        if (!value) {
          return false;
        }
        const parsed = JSON.parse(value);
        return parsed?.value?.toAddress === toAddress;
      },
      'not sent yet',
      { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
    );

    t.log('sentValue', sentValue);
    return sentValue;
  };

  const { balances: hookBalances0 } = await bankBalances(addressHook);
  const { balances: receiverBalances0 } = await bankBalances(receiverAddress);

  await sendTo(addressHook, [{ denom: 'ubld', amount: '13' }]);

  const { delta: senderDelta2 } = await bankBalances(senderAddress, balances1);
  const { delta: hookDelta1 } = await bankBalances(addressHook, hookBalances0);
  const { delta: receiverDelta1 } = await bankBalances(
    receiverAddress,
    receiverBalances0,
  );

  const actualDeltas = {
    hookDelta: hookDelta1,
    senderDelta: senderDelta2,
    receiverDelta: receiverDelta1,
  };
  t.log('actualDeltas', actualDeltas);
  t.deepEqual(
    actualDeltas,
    {
      hookDelta: {},
      senderDelta: { ubld: '-13' },
      receiverDelta: { ubld: '13' },
    },
    `expected transfer to be distributed correctly`,
  );

  const sentValue = await retryUntilCondition(
    async () => readPublished(`${nodePath}.tap`),
    value => !!value,
    'not sent yet',
    { setTimeout, retryIntervalMs: 5000, maxRetries: 15 },
  );

  t.log('tap sentValue', sentValue);
  const tapObj = JSON.parse(sentValue);

  const expectedData = {
    sender: senderAddress,
    receiver: addressHook,
    memo: JSON.stringify({ hookedTypeUrl: '/cosmos.bank.v1beta1.MsgSend' }),
    denom: 'localchain-msg/channel-0/ubld',
    amount: '13',
  };
  const expectedTapObj = {
    event: 'receivePacket',
    packet: {
      destination_channel: 'channel-1',
      destination_port: 'localchain-msg',
      sequence: '1',
      source_channel: 'channel-0',
      source_port: 'localchain-msg',
    },
    target: receiverAddress,
    type: 'VTRANSFER_IBC_EVENT',
  };
  t.like(tapObj, expectedTapObj, `tap object is not like expected`);
  t.deepEqual(
    JSON.parse(atob(tapObj.packet.data)),
    expectedData,
    `tap obj.packet.data does not match expected`,
  );
});
