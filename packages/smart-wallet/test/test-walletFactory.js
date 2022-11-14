/* eslint-disable no-await-in-loop */
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { BridgeId } from '@agoric/internal';
import { makeImportContext } from '@agoric/wallet-backend/src/marshal-contexts.js';
import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { E } from '@endo/far';
import { makeDefaultTestContext } from './contexts.js';
import {
  ActionType,
  headValue,
  makeMockTestSpace,
  subscriptionKey,
} from './supports.js';

import '@agoric/vats/src/core/types.js';

/** @type {import('ava').TestFn<Awaited<ReturnType<makeDefaultTestContext>>>} */
const test = anyTest;

const mockAddress1 = 'mockAddress1';
const mockAddress2 = 'mockAddress2';
const mockAddress3 = 'mockAddress3';

test.before(async t => {
  t.context = await makeDefaultTestContext(t, makeMockTestSpace);
});

test('bridge handler', async t => {
  const smartWallet = await t.context.simpleProvideWallet(mockAddress1);
  const updates = await E(smartWallet).getUpdatesSubscriber();
  const current = await E(smartWallet).getCurrentSubscriber();

  const ctx = makeImportContext();

  const board = await t.context.consume.board;
  const someInstance = makeHandle('Instance');
  ctx.ensureBoardId(board.getId(someInstance), someInstance);

  // fund the wallet with anchor

  /** @type {import('../src/offers.js').OfferSpec} */
  const offerSpec = {
    id: 1,
    invitationSpec: {
      source: 'purse',
      description: 'bogus',
      instance: someInstance,
    },
    proposal: {},
  };

  t.like(await headValue(updates), {
    updated: 'balance',
    currentAmount: {
      value: [],
    },
  });
  t.like(await headValue(current), {
    // error because it's deprecated
    lastOfferId: -1,
  });

  assert(t.context.sendToBridge);
  const res = await t.context.sendToBridge(BridgeId.WALLET, {
    type: ActionType.WALLET_SPEND_ACTION,
    owner: mockAddress1,
    // consider a helper for each action type
    spendAction: JSON.stringify(
      ctx.fromBoard.serialize(
        harden({ method: 'executeOffer', offer: offerSpec }),
      ),
    ),
    blockTime: 0,
    blockHeight: 0,
  });
  t.is(res, undefined);

  t.deepEqual(await headValue(updates), {
    updated: 'offerStatus',
    status: {
      ...offerSpec,
      error: 'Error: no invitation match (0 description and 0 instance)',
    },
  });
});

test('bridge with offerId string', async t => {
  await t.context.simpleProvideWallet(mockAddress2);
  const ctx = makeImportContext();

  const board = await t.context.consume.board;
  const someInstance = makeHandle('Instance');
  ctx.ensureBoardId(board.getId(someInstance), someInstance);

  // fund the wallet with anchor

  /** @type {import('../src/offers.js').OfferSpec} */
  const offerSpec = {
    id: 'uniqueString',
    invitationSpec: {
      source: 'purse',
      description: 'bogus',
      instance: someInstance,
    },
    proposal: {},
  };
  assert(t.context.sendToBridge);
  const res = await t.context.sendToBridge(BridgeId.WALLET, {
    type: ActionType.WALLET_SPEND_ACTION,
    owner: mockAddress2,
    // consider a helper for each action type
    spendAction: JSON.stringify(
      ctx.fromBoard.serialize(
        harden({ method: 'executeOffer', offer: offerSpec }),
      ),
    ),
    blockTime: 0,
    blockHeight: 0,
  });
  t.is(res, undefined);
});

test.todo('spend action over bridge');

test('notifiers', async t => {
  async function checkAddress(address) {
    const smartWallet = await t.context.simpleProvideWallet(address);

    // xxx no type of getUpdatesSubscriber()
    const updates = await E(smartWallet).getUpdatesSubscriber();

    t.is(
      await subscriptionKey(updates),
      `mockChainStorageRoot.wallet.${address}`,
    );

    const current = await E(smartWallet).getCurrentSubscriber();

    t.is(
      await subscriptionKey(current),
      `mockChainStorageRoot.wallet.${address}.current`,
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
