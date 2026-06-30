import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import {
  makeSigningSmartWalletKitFromClient,
  reflectWalletStore,
} from '../../client-utils/src/main.ts';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import type {
  DeliverTxResponse,
  SignerData,
  SigningStargateClient,
} from '@cosmjs/stargate';
import type { EncodeObject } from '@cosmjs/proto-signing';
import { LOCAL_CONFIG } from '../../client-utils/src/network-config.js';
import { makeSmartWalletKit } from '../../client-utils/src/smart-wallet-kit.js';
import { makeUpgradeEncodeObject } from '../src/ymax-authz-msgs.ts';
import { WALLET_KEY } from '../src/ymax-admin-helpers.ts';

const notImplemented = () => {
  throw Error('not implemented');
};

test('upgrade tx generation captures exact sign input and broadcast bytes', async t => {
  const signCalls: Array<{
    signerAddress: string;
    messages: readonly EncodeObject[];
    fee: unknown;
    memo: string;
    signerData: SignerData;
  }> = [];
  const broadcastCalls: Array<{ txBytes: Uint8Array }> = [];
  const signAndBroadcastCalls: unknown[] = [];
  const signedTx = {
    bodyBytes: Uint8Array.from([1, 2, 3]),
    authInfoBytes: Uint8Array.from([4, 5, 6]),
    signatures: [Uint8Array.from([7, 8, 9])],
  };
  const connectClient = {
    signAndBroadcast: async (...args: unknown[]) => {
      signAndBroadcastCalls.push(args);
      return { code: 99 } as DeliverTxResponse;
    },
    sign: async (
      signerAddress: string,
      messages: readonly EncodeObject[],
      fee: unknown,
      memo: string,
      signerData: SignerData,
    ) => {
      signCalls.push({ signerAddress, messages, fee, memo, signerData });
      return signedTx;
    },
    broadcastTx: async (txBytes: Uint8Array) => {
      broadcastCalls.push({ txBytes });
      return {
        code: 0,
        transactionHash: 'UPTX123',
        height: 80,
      } as DeliverTxResponse;
    },
  } as SigningStargateClient;

  const walletUtils = await makeSmartWalletKit(
    { fetch: notImplemented, delay: notImplemented, names: false },
    LOCAL_CONFIG,
  );
  const signing = await makeSigningSmartWalletKitFromClient({
    smartWalletKit: walletUtils,
    address: CONTROL_ADDRESSES.ymax0.main,
    client: connectClient,
  });
  const walletStore = reflectWalletStore(signing, {
    setTimeout: globalThis.setTimeout,
    makeNonce: () => 'nonce-123',
    sendOnly: true,
  });

  const signerData: SignerData = {
    accountNumber: 123,
    sequence: 456,
    chainId: 'agoric-3',
  };
  const postalServiceInstance = harden({ kind: 'postalService' });
  const upgradeArgs = harden({
    bundleId: 'b1-abc123',
    privateArgsOverrides: harden({
      oracle: 'value',
      postalServiceInstance,
    }),
  });

  const { tx, id } = await walletStore
    .get<any>(WALLET_KEY)
    .upgrade.once({ signerData })(upgradeArgs);

  t.is(tx.transactionHash, 'UPTX123');
  t.is(id, 'upgrade.nonce-123');
  t.is(signAndBroadcastCalls.length, 0);
  t.is(signCalls.length, 1);
  t.is(broadcastCalls.length, 1);

  const expectedMessage = makeUpgradeEncodeObject(
    {
      bundleId: 'b1-abc123',
      privateArgsOverrides: upgradeArgs.privateArgsOverrides,
    },
    {
      marshaller: walletUtils.marshaller,
      controlAddress: CONTROL_ADDRESSES.ymax0.main,
      invocationId: 'upgrade.nonce-123',
    },
  );

  t.deepEqual(signCalls[0], {
    signerAddress: CONTROL_ADDRESSES.ymax0.main,
    messages: [expectedMessage],
    fee: {
      amount: [{ denom: 'ubld', amount: '10000' }],
      gas: '400000',
    },
    memo: '',
    signerData,
  });

  t.deepEqual(broadcastCalls[0]?.txBytes, TxRaw.encode(signedTx).finish());
});
