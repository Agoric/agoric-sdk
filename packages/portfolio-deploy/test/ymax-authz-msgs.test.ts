import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { GenericAuthorization } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/authz.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/codegen/google/protobuf/any.js';
import { TxBody, TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { stringToPath } from '@cosmjs/crypto';
import { fromBase64 } from '@cosmjs/encoding';
import {
  DirectSecp256k1HdWallet,
  encodePubkey,
  makeAuthInfoBytes,
  makeSignDoc,
  Registry,
  type EncodeObject,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { LOCAL_CONFIG } from '@agoric/client-utils/src/network-config.js';
import { makeSmartWalletKit } from '@agoric/client-utils/src/smart-wallet-kit.js';
import {
  makeGrantEncodeObject,
  makeUpgradeEncodeObject,
  makeUpgradeExecEncodeObject,
} from '../src/ymax-authz-msgs.ts';

const agoricHdPath = stringToPath(`m/44'/564'/0'/0/0`);
const registry = new Registry([
  [MsgWalletSpendAction.typeUrl, MsgWalletSpendAction as GeneratedType],
  [MsgExec.typeUrl, MsgExec as GeneratedType],
]);

const tx1 = {
  kind: 'ymax-devnet-authz-upgrade',
  contract: 'ymax0',
  controlAddress: 'agoric10utru593dspjwfewcgdak8lvp9tkz0xttvcnxv',
  grantee: 'agoric1f0h5zgxyg3euxsqzs0506uj4cmu56y30pqx46s',
  bundleId:
    'b1-316b352b6364adbb8da357504b96dca7707f654caae7c70db1646b87b79e96556703c3f67c38d4b79088c4cc088a9d68464c1b54a2e44a2ccd1fbfcaee174e3f',
  invocationId: 'devnet-ymax0-2026-06-26T17:39:38.685Z',
  chainId: 'agoricdev-25',
  txBytesBase64:
    'CtAECs0ECh0vY29zbW9zLmF1dGh6LnYxYmV0YTEuTXNnRXhlYxKrBAotYWdvcmljMWYwaDV6Z3h5ZzNldXhzcXpzMDUwNnVqNGNtdTU2eTMwcHF4NDZzEvkDCiUvYWdvcmljLnN3aW5nc2V0Lk1zZ1dhbGxldFNwZW5kQWN0aW9uEs8DChR/Fj5QsWwDJycuwhvbH+wJV2E8yxK2A3siYm9keSI6IiN7XCJtZXNzYWdlXCI6e1wiYXJnc1wiOlt7XCJidW5kbGVJZFwiOlwiYjEtMzE2YjM1MmI2MzY0YWRiYjhkYTM1NzUwNGI5NmRjYTc3MDdmNjU0Y2FhZTdjNzBkYjE2NDZiODdiNzllOTY1NTY3MDNjM2Y2N2MzOGQ0Yjc5MDg4YzRjYzA4OGE5ZDY4NDY0YzFiNTRhMmU0NGEyY2NkMWZiZmNhZWUxNzRlM2ZcIixcInByaXZhdGVBcmdzT3ZlcnJpZGVzXCI6e1wicG9zdGFsU2VydmljZUluc3RhbmNlXCI6XCIkMC5BbGxlZ2VkOiBCb2FyZFJlbW90ZUluc3RhbmNlSGFuZGxlXCJ9fV0sXCJpZFwiOlwiZGV2bmV0LXltYXgwLTIwMjYtMDYtMjZUMTc6Mzk6MzguNjg1WlwiLFwibWV0aG9kXCI6XCJ1cGdyYWRlXCIsXCJ0YXJnZXROYW1lXCI6XCJ5bWF4Q29udHJvbFwifSxcIm1ldGhvZFwiOlwiaW52b2tlRW50cnlcIn0iLCJzbG90cyI6WyJib2FyZDAzODQxMyJdfRJlCk4KRgofL2Nvc21vcy5jcnlwdG8uc2VjcDI1NmsxLlB1YktleRIjCiECLi4lUpzOCHGX2ksAwXzm5PoYm32voawQcx0r2cNR7aISBAoCCAESEwoNCgR1YmxkEgUxMDAwMBCAtRgaQKY/cajfavolNW238eN/3MYAFR5ydYlAKm7O0z01mr6IJv29dBMiJfl1PVmVwUvcVmqDXHoWj3ACiZBxozp60Ug=',
  txBytesSha256:
    'b88a1e79f9755f58b90fd3fbb56f93e71932c4a1464e91d4e101acbfee3250a8',
  signerData: {
    accountNumber: 122,
    sequence: 0,
    chainId: 'agoricdev-25',
  },
  createdAt: '2026-06-26T17:39:41.306Z',
  memo: '',
  txHash: 'B88A1E79F9755F58B90FD3FBB56F93E71932C4A1464E91D4E101ACBFEE3250A8',
  height: 7697853,
} as const;
const txParts = (() => {
  const txRaw = TxRaw.decode(Buffer.from(tx1.txBytesBase64, 'base64'));
  const body = TxBody.decode(txRaw.bodyBytes);
  const exec = MsgExec.decode(body.messages[0].value);
  const spend = MsgWalletSpendAction.decode(exec.msgs[0].value);
  const capData = JSON.parse(spend.spendAction);
  const upgradeArgs = {
    bundleId: tx1.bundleId,
    privateArgsOverrides: {},
  };
  return { txRaw, body, exec, spend, capData, upgradeArgs };
})();

const fee = {
  amount: [{ denom: 'ubld', amount: '10000' }],
  gas: '400000',
};

const notImplemented = () => {
  throw Error('not implemented');
};

const walletUtilsP = makeSmartWalletKit(
  { fetch: notImplemented, delay: notImplemented, names: false },
  LOCAL_CONFIG,
);

const signEncodeObject = async ({
  mnemonic,
  message,
  memo,
  signerData = { ...tx1.signerData },
}: {
  mnemonic: string;
  message: EncodeObject;
  memo: string;
  signerData?: {
    accountNumber: number;
    sequence: number;
    chainId: string;
  };
}) => {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    prefix: 'agoric',
    hdPaths: [agoricHdPath],
  });
  const [account] = await wallet.getAccounts();
  account || assert.fail('missing account');
  const bodyBytes = registry.encodeTxBody({
    messages: [message],
    memo,
  });
  const authInfoBytes = makeAuthInfoBytes(
    [
      {
        pubkey: encodePubkey({
          type: 'tendermint/PubKeySecp256k1',
          value: Buffer.from(account.pubkey).toString('base64'),
        }),
        sequence: signerData.sequence,
      },
    ],
    fee.amount,
    Number(fee.gas),
    undefined,
    undefined,
  );
  const signDoc = makeSignDoc(
    bodyBytes,
    authInfoBytes,
    signerData.chainId,
    signerData.accountNumber,
  );
  const { signed, signature } = await wallet.signDirect(
    account.address,
    signDoc,
  );
  const txRaw = TxRaw.fromPartial({
    bodyBytes: signed.bodyBytes,
    authInfoBytes: signed.authInfoBytes,
    signatures: [fromBase64(signature.signature)],
  });
  return {
    account,
    signature,
    txRaw,
  };
};

const getFixtureUpgradeArgs = async () => {
  const walletUtils = await walletUtilsP;
  const action = walletUtils.marshaller.fromCapData(txParts.capData) as {
    method: string;
    message: {
      id: string;
      targetName: string;
      method: string;
      args: [
        { bundleId: string; privateArgsOverrides: Record<string, unknown> },
      ];
    };
  };
  return {
    marshaller: walletUtils.marshaller,
    action,
    upgradeArgs: action.message.args[0],
  };
};

test('makeGrantEncodeObject grants MsgWalletSpendAction for 4 hours', t => {
  const expiresAt = new Date('2026-07-01T16:00:00.000Z');
  const actual = makeGrantEncodeObject({
    granter: tx1.controlAddress,
    grantee: tx1.grantee,
    expiresAt,
  });

  t.is(actual.typeUrl, MsgGrant.typeUrl);
  const decoded = MsgGrant.decode(
    MsgGrant.encode(actual.value as any).finish(),
  );
  t.is(decoded.granter, tx1.controlAddress);
  t.is(decoded.grantee, tx1.grantee);
  const authorization = Any.decode(
    Any.encode(decoded.grant?.authorization as any).finish(),
  );
  t.is(authorization.typeUrl, GenericAuthorization.typeUrl);
  t.deepEqual(GenericAuthorization.decode(authorization.value), {
    $typeUrl: GenericAuthorization.typeUrl,
    msg: MsgWalletSpendAction.typeUrl,
  });
  t.deepEqual(decoded.grant?.expiration, {
    seconds: BigInt(1782921600),
    nanos: 0,
  });
});

test('makeUpgradeExecEncodeObject wraps upgrade in authz exec', async t => {
  const { marshaller, action, upgradeArgs } = await getFixtureUpgradeArgs();
  const actual = makeUpgradeExecEncodeObject(upgradeArgs, {
    marshaller,
    controlAddress: tx1.controlAddress,
    grantee: tx1.grantee,
    invocationId: tx1.invocationId,
  });

  t.is(actual.typeUrl, MsgExec.typeUrl);
  const decodedExec = MsgExec.decode(
    MsgExec.encode(actual.value as any).finish(),
  );
  t.is(decodedExec.grantee, tx1.grantee);
  t.is(decodedExec.msgs.length, 1);
  t.is(decodedExec.msgs[0].typeUrl, MsgWalletSpendAction.typeUrl);

  const decodedSpend = MsgWalletSpendAction.decode(decodedExec.msgs[0].value);
  t.deepEqual(decodedSpend.owner, toAccAddress(tx1.controlAddress));
  t.deepEqual(
    marshaller.fromCapData(JSON.parse(decodedSpend.spendAction)),
    action,
  );
});

test('authz exec message signs cryptographically', async t => {
  const { marshaller, action, upgradeArgs } = await getFixtureUpgradeArgs();
  const granteeMnemonic = 'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong';
  const wallet = {
    control: await DirectSecp256k1HdWallet.fromMnemonic(
      'test test test test test test test test test test test junk',
      { prefix: 'agoric', hdPaths: [agoricHdPath] },
    ),
    grantee: await DirectSecp256k1HdWallet.fromMnemonic(granteeMnemonic, {
      prefix: 'agoric',
      hdPaths: [agoricHdPath],
    }),
  };
  const accounts = {
    control: (await wallet.control.getAccounts())[0],
    grantee: (await wallet.grantee.getAccounts())[0],
  };
  accounts.control || assert.fail('missing control account');
  accounts.grantee || assert.fail('missing grantee account');

  const message = makeUpgradeExecEncodeObject(upgradeArgs, {
    marshaller,
    controlAddress: accounts.control.address,
    grantee: accounts.grantee.address,
    invocationId: tx1.invocationId,
  });
  const { account, signature, txRaw } = await signEncodeObject({
    mnemonic: granteeMnemonic,
    message,
    memo: tx1.memo,
    signerData: tx1.signerData,
  });

  t.is(account.address, accounts.grantee.address);
  t.is(signature.pub_key.type, 'tendermint/PubKeySecp256k1');
  t.is(
    signature.pub_key.value,
    Buffer.from(accounts.grantee.pubkey).toString('base64'),
  );
  t.is(fromBase64(signature.signature).length, 64);

  const body = TxBody.decode(txRaw.bodyBytes);
  const decodedExec = MsgExec.decode(body.messages[0].value);
  t.is(decodedExec.grantee, accounts.grantee.address);
  const decodedSpend = MsgWalletSpendAction.decode(decodedExec.msgs[0].value);
  t.deepEqual(decodedSpend.owner, toAccAddress(accounts.control.address));
  t.deepEqual(
    marshaller.fromCapData(JSON.parse(decodedSpend.spendAction)),
    action,
  );
});

test('direct spend action message signs cryptographically', async t => {
  const { marshaller, action, upgradeArgs } = await getFixtureUpgradeArgs();
  const controlMnemonic =
    'test test test test test test test test test test test junk';
  const controlWallet = await DirectSecp256k1HdWallet.fromMnemonic(
    controlMnemonic,
    {
      prefix: 'agoric',
      hdPaths: [agoricHdPath],
    },
  );
  const [controlAccount] = await controlWallet.getAccounts();
  controlAccount || assert.fail('missing control account');

  const message = makeUpgradeEncodeObject(upgradeArgs, {
    marshaller,
    controlAddress: controlAccount.address,
    invocationId: tx1.invocationId,
  });
  const { account, signature, txRaw } = await signEncodeObject({
    mnemonic: controlMnemonic,
    message,
    memo: tx1.memo,
    signerData: tx1.signerData,
  });

  t.is(account.address, controlAccount.address);
  t.is(signature.pub_key.type, 'tendermint/PubKeySecp256k1');
  t.is(
    signature.pub_key.value,
    Buffer.from(controlAccount.pubkey).toString('base64'),
  );
  t.is(fromBase64(signature.signature).length, 64);

  const body = TxBody.decode(txRaw.bodyBytes);
  const decodedSpend = MsgWalletSpendAction.decode(body.messages[0].value);
  t.deepEqual(decodedSpend.owner, toAccAddress(controlAccount.address));
  t.deepEqual(
    marshaller.fromCapData(JSON.parse(decodedSpend.spendAction)),
    action,
  );
});
