import '@endo/init/legacy.js';

import test from 'ava';

import type { SignerData, StdFee } from '@cosmjs/stargate';

import { arrayIsLike } from '@agoric/internal/tools/ava-assertions.js';
import type {
  InvokeStoreEntryAction,
  BridgeAction,
} from '@agoric/smart-wallet/src/smartWallet.js';

import {
  reflectWalletStore,
  type WalletStoreSigner,
} from '../src/wallet-store.js';

type BridgeSend<T extends BridgeAction = BridgeAction> = {
  action: T;
  fee?: StdFee;
  memo?: string;
  signerData?: SignerData;
};

const makeMockSigner = () => {
  const sends: BridgeSend[] = [];
  let lastId = '';
  const signer: WalletStoreSigner = {
    sendBridgeAction: async (action, fee, memo, signerData) => {
      lastId = (action as any).message?.id || '';
      sends.push({ action, fee, memo, signerData });
      return {
        height: -1,
        txIndex: 0,
        code: 0,
        transactionHash: '',
        events: [],
        msgResponses: [],
        gasUsed: 0n,
        gasWanted: 0n,
      };
    },
    query: {
      getLastUpdate: async () => ({
        updated: 'invocation',
        id: lastId,
        result: { passStyle: 'undefined' },
      }),
    },
  };
  return { sends, signer };
};

const makeImmediateSetTimeout = () => {
  const immediateSetTimeout = (fn, _ms, ..._args) => setTimeout(fn, 0);
  return immediateSetTimeout;
};

test('reflectWalletStore', async t => {
  const { sends, signer } = makeMockSigner();
  const walletStore = reflectWalletStore(signer, {
    setTimeout: makeImmediateSetTimeout(),
    makeNonce: () => '123',
  });

  const fee: StdFee = { amount: [], gas: '0denom' };
  const target = walletStore.get<any>('foo', { fee });

  await target.bar('baz');
  await target.qux.once({})(1);
  await target.qux.once({ memo: 'quux' })(2);

  arrayIsLike(t, sends, [
    {
      action: {
        method: 'invokeEntry',
        message: {
          targetName: 'foo',
          method: 'bar',
          args: ['baz'],
          id: 'bar.123',
        },
      },
      fee,
    },
    {
      action: {
        method: 'invokeEntry',
        message: {
          targetName: 'foo',
          method: 'qux',
          args: [1],
          id: 'qux.123',
        },
      },
      fee,
      memo: undefined,
    },
    {
      action: {
        method: 'invokeEntry',
        message: {
          targetName: 'foo',
          method: 'qux',
          args: [2],
          id: 'qux.123',
        },
      },
      fee,
      memo: 'quux',
    },
  ]);
});

test('reflectWalletStore save/overwrite', async t => {
  const { sends, signer } = makeMockSigner();
  const walletStore = reflectWalletStore(signer, {
    setTimeout: makeImmediateSetTimeout(),
    makeNonce: () => '123',
  });

  const target = walletStore.get<any>('ymaxControl');

  await target.getCreatorFacet('arg1', 2);
  t.is(sends.length, 1);
  const message1 = (sends[0].action as InvokeStoreEntryAction).message;
  t.deepEqual(message1.args, ['arg1', 2]);
  t.falsy(message1.saveResult);

  await target.getCreatorFacet.once({ saveAs: 'creatorFacet' })('arg2');
  t.is(sends.length, 2);
  const message2 = (sends[1].action as InvokeStoreEntryAction).message;
  t.deepEqual(message2.args, ['arg2']);
  t.deepEqual(message2.saveResult, {
    name: 'creatorFacet',
    overwrite: false,
  });

  await target.getCreatorFacet.once({
    saveAs: 'creatorFacet',
    overwrite: true,
  })('arg3');
  t.is(sends.length, 3);
  const message3 = (sends[2].action as InvokeStoreEntryAction).message;
  t.deepEqual(message3.args, ['arg3']);
  t.deepEqual(message3.saveResult, {
    name: 'creatorFacet',
    overwrite: true,
  });
});

test('deprecated reflectWalletStore pseudo-methods', async t => {
  const { sends, signer } = makeMockSigner();
  const walletStore = reflectWalletStore(signer, {
    setTimeout: makeImmediateSetTimeout(),
    makeNonce: () => '123',
  });

  const target = walletStore.get<any>('ymaxControl');

  await target.getCreatorFacet('arg1', 2);
  t.is(sends.length, 1);
  const message1 = (sends[0].action as InvokeStoreEntryAction).message;
  t.deepEqual(message1.args, ['arg1', 2]);
  t.falsy(message1.saveResult);

  await target.saveAs('creatorFacet').getCreatorFacet('arg2');
  t.is(sends.length, 2);
  const message2 = (sends[1].action as InvokeStoreEntryAction).message;
  t.deepEqual(message2.args, ['arg2']);
  t.deepEqual(message2.saveResult, {
    name: 'creatorFacet',
    overwrite: false,
  });

  await target.overwrite('creatorFacet').getCreatorFacet('arg3');
  t.is(sends.length, 3);
  const message3 = (sends[2].action as InvokeStoreEntryAction).message;
  t.deepEqual(message3.args, ['arg3']);
  t.deepEqual(message3.saveResult, {
    name: 'creatorFacet',
    overwrite: true,
  });
});

test('reflectWalletStore supports fee/memo/signerData', async t => {
  const { sends, signer } = makeMockSigner();
  const walletStore = reflectWalletStore(signer, {
    setTimeout: makeImmediateSetTimeout(),
    makeNonce: () => '123',
  });

  const fee: StdFee = { amount: [], gas: '0denom' };
  const memo = 'Kilroy was here';
  const signerData: SignerData = {
    accountNumber: 123,
    sequence: 456,
    chainId: 'test-chain',
  };

  const target = walletStore.get<any>('foo', { fee });
  await target.bar.once({ memo, signerData })('baz');

  arrayIsLike(t, sends, [
    {
      action: {
        method: 'invokeEntry',
        message: {
          targetName: 'foo',
          method: 'bar',
          args: ['baz'],
          id: 'bar.123',
        },
      },
      fee,
      memo,
      signerData,
    },
  ]);
});

test('reflectWalletStore target.method.once', async t => {
  const { signer } = makeMockSigner();
  const walletStore = reflectWalletStore(signer, {
    setTimeout: makeImmediateSetTimeout(),
    makeNonce: () => '123',
  });

  const target = walletStore.get<any>('foo');
  t.throws(
    // @ts-expect-error intentional misuse
    () => target.bar.once(),
    { message: 'missing single-tx options' },
    'target.method.once requires options',
  );
  const bound = target.bar.once({});
  await bound();
  await t.throwsAsync(bound, { message: 'single-tx options cannot be reused' });
});
