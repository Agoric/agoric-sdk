/** @file sketch of e2e flows
 * https://docs.google.com/document/d/1GcyHRmg4sZ6DVTBgGkmyESdeGKDktSnahtBPQhFcB5M/edit
 */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { E } from '@endo/far';
import type { EncodeObject } from '@cosmjs/proto-signing';
import { coins, coin } from '@cosmjs/proto-signing';
import { MsgSend } from 'cosmjs-types/cosmos/bank/v1beta1/tx.js';
import { MsgDelegate } from 'cosmjs-types/cosmos/staking/v1beta1/tx.js';
import type { Coin } from 'cosmjs-types/cosmos/base/v1beta1/coin.js';

type InterchainAccount = {
  // maybe don't need to be methods
  getWalletAddress: () => Promise<string>;
  getLastSequence: () => Promise<bigint>;
  getChainId: () => Promise<string>;
  sendMessages: (msgs: EncodeObject[]) => Promise<{ sequence: bigint }>;
};

type InterchainManager = {
  createInterchainAccount: () => Promise<InterchainAccount>;
};

const makeInterchainAccount = () =>
  Promise.resolve({
    // our account is known by channelId, maybe include this as well
    getWalletAddress: () => Promise.resolve('osmosis123'),
    sendMessages: (_msgs: EncodeObject[]) => Promise.resolve({ sequence: 1n }),
    getLastSequence: () => Promise.resolve(1n),
    // maybe should be getHostConnectionId -> `channel-1`. ICA is agnostic to chainId
    getChainId: () => Promise.resolve('osmosis-1'),
  });

const orc = {
  lookupChain(_chainName: string) {
    return {
      createInterchainAccount: () => makeInterchainAccount(),
    } as InterchainManager;
  },
};

test('1. Create Interchain account on remote chain', async t => {
  const cosmosChain: InterchainManager = await E(orc).lookupChain('osmosis');
  const ica1: InterchainAccount =
    await E(cosmosChain).createInterchainAccount();
  t.truthy(ica1);
});

test('2. Generate Interchain Query and receive response', async t => {
  //  gaiad query interchain-accounts host packet-events [channel-id] [sequence] [flags]
  const cosmosChain: InterchainManager = await E(orc).lookupChain('osmosis');
  const ica1: InterchainAccount =
    await E(cosmosChain).createInterchainAccount();

  // E(orc).queryHost(host);

  t.truthy(ica1);
});

test('4a. Delegate tokens held by ICA on remote chain', async t => {
  // Submit a delegation message.
  const cosmosChain: InterchainManager = await E(orc).lookupChain('osmosis');
  const ica1: InterchainAccount =
    await E(cosmosChain).createInterchainAccount();

  const walletAddress = await E(ica1).getWalletAddress();
  const encodedMsg = {
    typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
    value: MsgDelegate.encode(
      MsgDelegate.fromPartial({
        amount: coin(1000, 'uatom'),
        validatorAddress: 'cosmos1abc',
        delegatorAddress: walletAddress,
      }),
    ),
  };

  const result = await E(ica1).sendMessages([encodedMsg]);
  t.truthy(result, 'returns sequence number');
});

// XXX name? worthwhile abstraction?
const codecs = {
  async encode(
    msgDelegate: typeof MsgDelegate,
    delegator: InterchainAccount,
    partial: Record<string, unknown>,
  ) {
    // this could be optimized by passing the immutable address along with the object
    const delegatorAddress = await E(delegator).getWalletAddress();
    const encodedMsg = msgDelegate
      .encode(
        MsgDelegate.fromPartial({
          ...partial,
          delegatorAddress,
        }),
      )
      .finish();
    return {
      typeUrl: '/cosmos.staking.v1beta1.MsgDelegate',
      value: encodedMsg,
    };
  },
};

test('4a. Delegate tokens held by ICA on remote chain (alt without address)', async t => {
  // Submit a delegation message.
  const cosmosChain: InterchainManager = await E(orc).lookupChain('osmosis');
  const ica1: InterchainAccount =
    await E(cosmosChain).createInterchainAccount();

  // ask validator 'cosmos1valoperabc'
  const encodedMsg = await codecs.encode(MsgDelegate, ica1, {
    amount: coin(1000, 'uatom'),
    validatorAddress: 'cosmos1valoperabc',
  });

  const result = await E(ica1).sendMessages([encodedMsg]);
  t.truthy(result);
});

const makeMsgSend = (
  fromAddress: string,
  toAddress: string,
  amount: Coin[],
) => ({
  typeUrl: '/cosmos.bank.v1beta1.MsgSend',
  value: MsgSend.encode(
    MsgSend.fromPartial({
      fromAddress,
      toAddress,
      amount,
    }),
  ).finish(),
});

test('XXX. Send tokens from ICA to another account on same Host chain', async t => {
  const receiver = 'cosmos345';
  const amount = coins(100, 'uatom');

  const cosmosChain: InterchainManager = await E(orc).lookupChain('osmosis');
  const ica1: InterchainAccount =
    await E(cosmosChain).createInterchainAccount();

  // many cosmos msg shapes require the sender's address?
  const sender = await E(ica1).getWalletAddress();
  // makeMsgSend from codec libary
  const message = makeMsgSend(receiver, sender, amount);
  // XXX gets a sequence number back, eventually. how do we know this means success?
  const result = await E(ica1).sendMessages([message]);
  t.deepEqual(result, { sequence: 1n });
});
