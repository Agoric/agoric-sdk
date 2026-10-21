import '@endo/init/legacy.js';

import test from 'ava';

import { decodeHex } from '@agoric/internal/src/hex.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import type {
  DeliverTxResponse,
  SignerData,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { makeSigningSmartWalletKit } from '../dist/signing-smart-wallet-kit.js';
import { LOCAL_CONFIG } from '../src/network-config.js';
import { makeSmartWalletKit } from '../src/smart-wallet-kit.js';

const mockSigner = () => {
  const calls: any[] = [];
  const signCalls: any[] = [];
  const broadcastCalls: any[] = [];
  const connectWithSigner: typeof SigningStargateClient.connectWithSigner =
    async () => {
      // @ts-expect-error incomplete mock
      return {
        async signAndBroadcast(
          signerAddress: string,
          messages: readonly EncodeObject[],
          fee: StdFee | 'auto' | number,
          memo?: string,
          timeoutHeight?: bigint,
        ) {
          calls.push({ signerAddress, messages, fee, memo, timeoutHeight });
          const resp = { code: 42 } as DeliverTxResponse;
          return resp;
        },
        async sign(
          signerAddress: string,
          messages: readonly EncodeObject[],
          fee: StdFee,
          memo: string,
          signerData: SignerData,
        ) {
          signCalls.push({ signerAddress, messages, fee, memo, signerData });
          const mockTxRaw = {
            bodyBytes: new Uint8Array(),
            authInfoBytes: new Uint8Array(),
            signatures: [],
          };
          return mockTxRaw;
        },
        async broadcastTx(txBytes: Uint8Array) {
          broadcastCalls.push({ txBytes });
          const resp = { code: 43 } as DeliverTxResponse;
          return resp;
        },
      } as SigningStargateClient;
    };
  return { calls, signCalls, broadcastCalls, connectWithSigner };
};

const notImplemented = () => {
  throw Error('not implemented');
};

const mnemonic =
  'cause eight cattle slot course mail more aware vapor slab hobby match';

test('sendBridgeAction handles simple action', async t => {
  const { calls, connectWithSigner } = mockSigner();

  const walletUtils = await makeSmartWalletKit(
    { fetch: notImplemented, delay: notImplemented, names: false },
    LOCAL_CONFIG,
  );

  const signing = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    mnemonic,
  );

  const actual = await signing.sendBridgeAction({
    method: 'tryExitOffer',
    offerId: 'bid-1',
  });
  t.deepEqual(actual, { code: 42 });
  t.is(calls.length, 1);
  t.like(calls[0], {
    signerAddress: 'agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl',
    messages: [
      {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: {
          owner: decodeHex(
            '2703d823 35a28e14 5a024159 151cd54f 4cbb7db0'.replace(/ /g, ''),
          ),
          spendAction:
            '{"body":"#{\\"method\\":\\"tryExitOffer\\",\\"offerId\\":\\"bid-1\\"}","slots":[]}',
        },
      },
    ],
    fee: { amount: [{ denom: 'ubld', amount: '10000' }], gas: '400000' },
  });
});

test('sendBridgeAction supports fee param', async t => {
  const { calls, connectWithSigner } = mockSigner();

  const walletUtils = await makeSmartWalletKit(
    { fetch: notImplemented, delay: notImplemented, names: false },
    LOCAL_CONFIG,
  );

  const signing = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    mnemonic,
  );

  const moar: StdFee = {
    gas: '1234567',
    amount: [{ denom: 'ubld', amount: '123' }],
  };
  const actual = await signing.sendBridgeAction(
    { method: 'tryExitOffer', offerId: 'bid-1' },
    moar,
  );
  t.deepEqual(actual, { code: 42 });
  t.is(calls.length, 1);
  t.like(calls[0], {
    fee: { amount: [{ denom: 'ubld', amount: '123' }], gas: '1234567' },
  });
});

test('sendBridgeAction uses explicit signing when signerData provided', async t => {
  const { calls, signCalls, broadcastCalls, connectWithSigner } = mockSigner();

  const walletUtils = await makeSmartWalletKit(
    { fetch: notImplemented, delay: notImplemented, names: false },
    LOCAL_CONFIG,
  );

  const signing = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    mnemonic,
  );

  const signerData: SignerData = {
    accountNumber: 123,
    sequence: 456,
    chainId: 'test-chain',
  };

  const actual = await signing.sendBridgeAction(
    { method: 'tryExitOffer', offerId: 'bid-1' },
    undefined, // use default fee
    'test memo',
    signerData,
  );

  // Should use explicit signing path, not signAndBroadcast
  t.deepEqual(actual, { code: 43 });
  t.is(calls.length, 0, 'signAndBroadcast should not be called');
  t.is(signCalls.length, 1, 'sign should be called once');
  t.is(broadcastCalls.length, 1, 'broadcastTx should be called once');

  t.like(signCalls[0], {
    signerAddress: 'agoric1yupasge4528pgkszg9v328x4faxtkldsnygwjl',
    messages: [
      {
        typeUrl: '/agoric.swingset.MsgWalletSpendAction',
        value: {
          owner: decodeHex(
            '2703d823 35a28e14 5a024159 151cd54f 4cbb7db0'.replace(/ /g, ''),
          ),
          spendAction:
            '{"body":"#{\\"method\\":\\"tryExitOffer\\",\\"offerId\\":\\"bid-1\\"}","slots":[]}',
        },
      },
    ],
    fee: { amount: [{ denom: 'ubld', amount: '10000' }], gas: '400000' },
    memo: 'test memo',
    signerData,
  });

  t.true(broadcastCalls[0].txBytes instanceof Uint8Array);
});

test('sendBridgeAction with signerData supports custom fee', async t => {
  const { signCalls, broadcastCalls, connectWithSigner } = mockSigner();

  const walletUtils = await makeSmartWalletKit(
    { fetch: notImplemented, delay: notImplemented, names: false },
    LOCAL_CONFIG,
  );

  const signing = await makeSigningSmartWalletKit(
    { connectWithSigner, walletUtils },
    mnemonic,
  );

  const customFee: StdFee = {
    gas: '9999999',
    amount: [{ denom: 'ubld', amount: '999' }],
  };

  const signerData: SignerData = {
    accountNumber: 789,
    sequence: 101112,
    chainId: 'custom-chain',
  };

  await signing.sendBridgeAction(
    // @ts-expect-error incomplete mock
    harden({ method: 'executeOffer', offer: { id: 'test-offer' } }),
    customFee,
    'custom memo',
    signerData,
  );

  t.is(signCalls.length, 1);
  t.like(signCalls[0], {
    fee: customFee,
    memo: 'custom memo',
    signerData,
  });
  t.is(broadcastCalls.length, 1);
});
