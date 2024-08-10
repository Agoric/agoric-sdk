import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeHandle } from '@agoric/zoe/src/makeHandle.js';
import { E } from '@endo/far';
import { makeImportContext } from '../src/marshal-contexts.js';
import { makeDefaultTestContext } from './contexts.js';
import {
  ActionType,
  headValue,
  makeMockTestSpace,
  topicPath,
} from './supports.js';

/**
 * @type {import('ava').TestFn<
 *   Awaited<ReturnType<makeDefaultTestContext>>
 * >}
 */
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

  const validMsg = {
    type: ActionType.WALLET_SPEND_ACTION,
    owner: mockAddress1,
    // consider a helper for each action type
    spendAction: JSON.stringify(
      ctx.fromBoard.toCapData(
        harden({ method: 'executeOffer', offer: offerSpec }),
      ),
    ),
    blockTime: 0,
    blockHeight: 0,
  };
  assert(t.context.sendToBridge);
  await t.throwsAsync(t.context.sendToBridge(validMsg), {
    message: 'no invitation match (0 description and 0 instance)',
  });

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
  const validMsg = {
    type: ActionType.WALLET_SPEND_ACTION,
    owner: mockAddress2,
    // consider a helper for each action type
    spendAction: JSON.stringify(
      ctx.fromBoard.toCapData(
        harden({ method: 'executeOffer', offer: offerSpec }),
      ),
    ),
    blockTime: 0,
    blockHeight: 0,
  };
  await t.throwsAsync(t.context.sendToBridge(validMsg), {
    message: 'no invitation match (0 description and 0 instance)',
  });

  // Verify it would have failed with a different 'type'.
  // This arguably belongs in a new test but putting it here makes clear
  // that everything is valid except for 'type'.
  await t.throwsAsync(
    t.context.sendToBridge({
      ...validMsg,
      type: 'BOGUS',
    }),
    { message: /^In "fromBridge" method/ },
  );
});

test('missing spend authority', async t => {
  const owner = 'agoric1missingSpend';
  // make a wallet and get its update stream, but don't use the wallet object
  const updates = await E(
    t.context.simpleProvideWallet(owner),
  ).getUpdatesSubscriber();
  const ctx = makeImportContext();

  const validMsg = {
    type: ActionType.WALLET_ACTION, // not SPEND
    owner,
    action: JSON.stringify(
      ctx.fromBoard.toCapData(
        harden({ method: 'tryExitOffer', offerId: 'irrelevant' }),
      ),
    ),
    blockTime: 0,
    blockHeight: 0,
  };
  assert(t.context.sendToBridge);
  // sending over the bridge succeeds without rejecting
  await t.context.sendToBridge(validMsg);

  // the signal of an error is available in chain storage
  t.deepEqual(await headValue(updates), {
    updated: 'walletAction',
    status: {
      error: 'tryExitOffer requires spend authority',
    },
  });
});

test('bad action value', async t => {
  const owner = 'agoric1badActionValue';
  // make a wallet and get its update stream, but don't use the wallet object
  const updates = await E(
    t.context.simpleProvideWallet(owner),
  ).getUpdatesSubscriber();

  const validMsg = {
    type: ActionType.WALLET_SPEND_ACTION,
    owner,
    spendAction: JSON.stringify({
      body: 'invalid capdata to force an error in handleBridgeAction',
      slots: [],
    }),
    blockTime: 0,
    blockHeight: 0,
  };
  assert(t.context.sendToBridge);
  // sending over the bridge succeeds without rejecting
  await t.context.sendToBridge(validMsg);

  // the signal of an error is available in chain storage
  const head = await headValue(updates);
  // For type narrowing
  assert(head.updated === 'walletAction');
  // The rest of the error message is different in Node 18 vs 20. On chain it
  // will come from an XS version that is in common across all validators.
  t.regex(head.status.error, /Unexpected token/);
});

test('notifiers', async t => {
  async function checkAddress(address) {
    const smartWallet = await t.context.simpleProvideWallet(address);

    t.is(
      await topicPath(smartWallet, 'updates'),
      `mockChainStorageRoot.wallet.${address}`,
    );

    t.is(
      await topicPath(smartWallet, 'current'),
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
