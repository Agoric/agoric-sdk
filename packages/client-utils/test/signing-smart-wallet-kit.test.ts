import test from 'ava';

import { decodeHex } from '@agoric/internal/src/hex.js';
import type { EncodeObject } from '@cosmjs/proto-signing';
import type {
  DeliverTxResponse,
  SigningStargateClient,
  StdFee,
} from '@cosmjs/stargate';
import { makeSigningSmartWalletKit } from '../dist/signing-smart-wallet-kit.js';
import { LOCAL_CONFIG } from '../src/network-config.js';
import { makeSmartWalletKit } from '../src/smart-wallet-kit.js';

const mockSigner = () => {
  const calls: any[] = [];
  const connectWithSigner: typeof SigningStargateClient.connectWithSigner =
    async () => {
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
      } as SigningStargateClient;
    };
  return { calls, connectWithSigner };
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

  const actual = await signing.sendBridgeAction(
    harden({ method: 'tryExitOffer', offerId: 'bid-1' }),
  );
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
    fee: { amount: [{ denom: 'ubld', amount: '500000' }], gas: '19700000' },
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
    harden({ method: 'tryExitOffer', offerId: 'bid-1' }),
    moar,
  );
  t.deepEqual(actual, { code: 42 });
  t.is(calls.length, 1);
  t.like(calls[0], {
    fee: { amount: [{ denom: 'ubld', amount: '123' }], gas: '1234567' },
  });
});
