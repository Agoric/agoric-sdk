/* eslint-disable no-await-in-loop */
// @ts-check

import * as BRIDGE_ID from '@agoric/vats/src/bridge-ids.js';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import '@agoric/vats/src/core/types.js';

import { makeImportContext } from '@agoric/wallet-backend/src/marshal-contexts.js';
import { E } from '@endo/far';
import { parseActionStr, stringifyAction } from '../src/walletFactory.js';
import { makeDefaultTestContext } from './contexts.js';
import {
  ActionType,
  currentState,
  makeMockTestSpace,
  subscriptionKey,
} from './supports.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>>} */
const test = anyTest;

const mockAddress1 = 'mockAddress1';
const mockAddress2 = 'mockAddress2';
const mockAddress3 = 'mockAddress3';

test.before(async t => {
  t.context = await makeDefaultTestContext(t, makeMockTestSpace);
});

test('bridge', async t => {
  const smartWallet = await t.context.simpleProvideWallet(mockAddress1);
  const updates = await E(smartWallet).getUpdatesSubscriber();
  t.truthy(updates);

  const lastUpdate = () => currentState(updates);

  const ctx = makeImportContext();

  // fund the wallet with anchor

  /** @type {import('../src/offers.js').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec: {
      source: 'purse',
      description: 'bogus',
      // @ts-expect-error invalid offer for error
      instance: null,
    },
    proposal: {},
  };

  assert(t.context.sendToBridge);
  const res = await t.context.sendToBridge(BRIDGE_ID.WALLET, {
    type: ActionType.WALLET_ACTION,
    owner: mockAddress1,
    action: stringifyAction({
      target: 'offers',
      method: 'executeOffer',
      arg: ctx.fromBoard.serialize(harden(offerSpec)),
    }),
  });
  t.is(res, undefined);

  t.deepEqual(await lastUpdate(), {
    updated: 'offerStatus',
    status: {
      ...offerSpec,
      state: 'error',
    },
  });
});

test.todo('spend action over bridge');

test('notifiers', async t => {
  async function checkAddress(address) {
    const smartWallet = await t.context.simpleProvideWallet(address);

    const updates = await E(smartWallet).getUpdatesSubscriber();

    t.is(
      // @ts-expect-error faulty typedef
      await subscriptionKey(updates),
      `mockChainStorageRoot.wallet.${address}`,
    );
  }

  await Promise.all(
    [mockAddress1, mockAddress2, mockAddress3].map(checkAddress),
  );
});

test.todo(
  'exit an active offer',
  // scenario: committee decided the anchor is junk
  // pause the PSM trading such that there is time to exit before offer resolves
  // executeOffer to buy the junk (which can't resolve)
  // exit the offer "oh I don't want to buy junk!"
);

test('wallet action encoding', t => {
  const action = /** @type {const} */ ({
    target: 'offers',
    method: 'executeOffer',
    arg: {
      body: 'bogus',
      slots: ['foo'],
    },
  });
  t.is(
    // @ts-expect-error CapData type should be readonly slots
    stringifyAction(action),
    'offers.executeOffer {"body":"bogus","slots":["foo"]}',
  );

  t.throws(
    // @ts-expect-error
    () => stringifyAction({ target: 'foo' }),
    {
      message: 'unsupported target foo',
    },
  );
  t.throws(
    // @ts-expect-error
    () => stringifyAction({ target: 'deposit', method: 'foo' }),
    {
      message: 'unsupported method foo',
    },
  );
  t.throws(
    // @ts-expect-error
    () => stringifyAction({ target: 'deposit', method: 'receive', arg: {} }),
    {
      message: 'invalid arg',
    },
  );
});

test('wallet action decoding', t => {
  const action = /** @type {const} */ ({
    target: 'offers',
    method: 'executeOffer',
    arg: {
      body: 'bogus',
      slots: ['foo'],
    },
  });
  // @ts-expect-error CapData type should be readonly slots
  const str = stringifyAction(action);
  t.deepEqual(parseActionStr(str), action);

  t.throws(() => parseActionStr(` ${str}`));
  t.throws(() => parseActionStr(`,${str}`));
  t.throws(() => parseActionStr(', '));
});
