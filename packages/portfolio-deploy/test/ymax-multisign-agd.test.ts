/** @file test agd-compatible multisign flows for ymax upgrade transactions */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { execFile as execFileCb } from 'node:child_process';
import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MsgExec } from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { TxBody, TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { makeCmdRunner, makeFileRW } from '@agoric/pola-io';
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { pubkeyToAddress } from '@cosmjs/amino';
import {
  decodePubkey,
  makeAuthInfoBytes,
  type EncodeObject,
} from '@cosmjs/proto-signing';
import type { ExecutionContext } from 'ava';
import { promisify } from 'node:util';
import {
  combineDetachedGranteeSignatures,
  makeUpgradeRequestBuilder,
} from '../src/ymax-authz-flow.ts';
import {
  makeAgdUnsignedTx,
  makeUpgradeEncodeObject,
  parseJsonPublicKey,
  parseSignedTxBytes,
  registry,
} from '../src/ymax-authz-msgs.ts';

const execFileP = promisify(execFileCb);
type ExecFile = typeof execFileP;
type FileRW = ReturnType<typeof makeFileRW>;
type FileRd = ReturnType<FileRW['readOnly']>;
type UnsignedTx = Awaited<ReturnType<typeof makeUnsignedAgdTx>>;
type CommandRecord = {
  actor: string;
  command: string;
};
type MultiSigTool = {
  addPubKey: (name: string, pubkey: string) => Promise<void>;
  addKey: (name: string, source: FileRd) => Promise<void>;
  makeMultisig: (
    name: string,
    members: string[],
    threshold: number,
  ) => Promise<{ name: string; address: string; pubkey: string }>;
  multisign: (
    multisig: MultisigAccount,
    sequence: number,
    unsigned: FileRd,
    signatures: FileRd[],
  ) => Promise<FileRd>;
  signAs: (
    from: string,
    multisig: MultisigAccount,
    sequence: number,
    unsigned: FileRd,
    signature: FileRW,
  ) => Promise<FileRd>;
  showPubKey: (name: string) => Promise<string>;
};
type SignerActor = {
  name: string;
  addKey: () => Promise<void>;
  addPubKey: (name: string, pubkey: string) => Promise<void>;
  makeMultisig: (
    memberPubKeys: string[],
    threshold: number,
    multisigName?: string,
  ) => Promise<{ name: string; address: string; pubkey: string }>;
  multisign: (
    multisig: MultisigAccount,
    sequence: number,
    unsigned: UnsignedTx,
    signatures: FileRd[],
  ) => Promise<FileRd>;
  sign: (
    multisig: MultisigAccount,
    sequence: number,
    unsigned: UnsignedTx,
  ) => Promise<FileRd>;
  showPubKey: () => Promise<string>;
};
type MultisigAccount = {
  address: string;
  accountNumber: number;
  chainId: string;
  name: string;
};

const fee = {
  gas: '400000',
  amount: [{ denom: 'ubld', amount: '10000' }],
} as const;

const tx1 = {
  chainId: 'agoricdevnet-99',
  invocationId: 'devnet-ymax0-2026-06-26T17:39:38.685Z',
  upgradeArgs: {
    bundleId:
      'b1-316b352b6364adbb8da357504b96dca7707f654caae7c70db1646b87b79e96556703c3f67c38d4b79088c4cc088a9d68464c1b54a2e44a2ccd1fbfcaee174e3f',
    privateArgsOverrides: {},
  },
} as const;

const marshalData = {
  toCapData: data => ({ body: `#${JSON.stringify(data)}`, slots: [] }),
};

// `agd keys show --pubkey` prints gRPC-gateway JSON (`@type`-tagged); mock
// on-chain account lookups need the amino `Pubkey` shape cosmjs uses.
const toAminoPubkey = (pubkeyJson: string) =>
  decodePubkey(
    parseJsonPublicKey(JSON.parse(pubkeyJson)) || assert.fail('invalid pubkey'),
  );

const makeUnsignedAgdTx = async ({
  controlPubkey,
  msg,
  sequence,
}: {
  controlPubkey: string;
  msg: EncodeObject;
  sequence: number;
}) => {
  const bodyBytes = registry.encodeTxBody({ messages: [msg], memo: '' });
  const authInfoBytes = makeAuthInfoBytes(
    [{ pubkey: undefined as never, sequence }],
    fee.amount,
    Number(fee.gas),
    undefined,
    undefined,
  );
  const unsigned = makeAgdUnsignedTx({ bodyBytes, authInfoBytes });
  unsigned.auth_info.signer_infos[0] = {
    ...unsigned.auth_info.signer_infos[0],
    public_key: JSON.parse(controlPubkey),
  };
  return unsigned;
};

const makeTestFiles = async (t: ExecutionContext, names: string[]) => {
  const tmp = await fsp.mkdtemp(path.join(tmpdir(), 'ymax-authz-agd-'));
  t.teardown(async () => {
    await execFileP('chmod', ['-R', 'u+w', tmp]).catch(() => undefined);
    await fsp.rm(tmp, { recursive: true, force: true });
  });
  const root = makeFileRW(tmp, { fsp, path });
  return Promise.all(
    names.map(async name => {
      const dir = root.join(name);
      await dir.mkdir();
      return dir;
    }),
  );
};

const assertSignedSpendAction = async (
  t: ExecutionContext,
  msg: EncodeObject,
  text: string,
) => {
  const signedTxBytes = parseSignedTxBytes(text);
  const signedTx = TxRaw.decode(signedTxBytes);
  const signedBody = TxBody.decode(signedTx.bodyBytes);
  const signedSpend = MsgWalletSpendAction.decode(
    signedBody.messages[0]!.value,
  );
  const expectedSpendAction = JSON.parse((msg.value as any).spendAction);

  t.is(signedBody.messages.length, 1);
  t.is(signedBody.messages[0]!.typeUrl, MsgWalletSpendAction.typeUrl);
  t.deepEqual(JSON.parse(signedSpend.spendAction), expectedSpendAction);
  t.true(signedTx.signatures.length > 0);
};

const writeJson = async (file: FileRW, specimen: unknown) => {
  await file.writeText(`${JSON.stringify(specimen, null, 2)}\n`);
  return file.readOnly();
};

const normalizeCommandText = (text: string) =>
  text.replace(/\/tmp\/ymax-authz-agd-[^/\s]*/g, '<tmp>');

const testModuleDir = path.dirname(fileURLToPath(import.meta.url));
const agdBinDir = path.resolve(testModuleDir, '../../../bin');

const makeRecordingExecFile = (
  execFile: ExecFile,
  records: CommandRecord[],
): ExecFile =>
  (async (file, argsOrOptions, maybeOptions) => {
    const args = Array.isArray(argsOrOptions) ? argsOrOptions : [];
    const keyringDirArg = args.find(arg =>
      String(arg).startsWith('--keyring-dir='),
    );
    const actor = keyringDirArg
      ? path.basename(String(keyringDirArg).slice('--keyring-dir='.length))
      : 'unknown';
    records.push({
      actor,
      command: normalizeCommandText(
        [file, ...args.map(arg => String(arg))].join(' '),
      ),
    });
    return execFile(file, argsOrOptions as never, maybeOptions);
  }) as ExecFile;

const makeMultiSigTool = ({
  env,
  files: root,
  execFile,
}: {
  env: NodeJS.ProcessEnv;
  files: FileRW;
  execFile: ExecFile;
}): MultiSigTool => {
  const agd = makeCmdRunner('agd', {
    execFile,
    defaultEnv: {
      ...env,
      PATH: [agdBinDir, env.PATH].filter(Boolean).join(path.delimiter),
    },
  }).withFlags(`--keyring-dir=${root.toString()}`, '--keyring-backend=test');

  const addKey = async (name: string, source: FileRd) => {
    await agd
      .subCommand('keys')
      .subCommand('add')
      .exec([
        name,
        '--recover',
        '--source',
        source.toString(),
        '--output=json',
      ]);
  };

  const addPubKey = async (name: string, pubkey: string) => {
    await agd
      .subCommand('keys')
      .subCommand('add')
      .exec([name, `--pubkey=${pubkey}`]);
  };

  const makeMultisig = async (
    name: string,
    members: string[],
    threshold: number,
  ) => {
    await agd
      .subCommand('keys')
      .subCommand('add')
      .exec([
        name,
        '--multisig',
        members.join(','),
        '--multisig-threshold',
        String(threshold),
        '--output=json',
      ]);
    const out = await agd
      .subCommand('keys')
      .subCommand('show')
      .exec([name, '--output=json']);
    return {
      name,
      ...(JSON.parse(out.stdout) as { address: string; pubkey: string }),
    };
  };

  const showPubKey = async (name: string) => {
    const out = await agd
      .subCommand('keys')
      .subCommand('show')
      .exec([name, '--pubkey']);
    return out.stdout.trim();
  };

  const signAs = async (
    from: string,
    multisig: MultisigAccount,
    sequence: number,
    unsigned: FileRd,
    signature: FileRW,
  ) => {
    await agd
      .subCommand('tx')
      .subCommand('sign')
      .exec([
        unsigned.toString(),
        '--offline',
        `--multisig=${multisig.name}`,
        '--from',
        from,
        '--account-number',
        String(multisig.accountNumber),
        '--sequence',
        String(sequence),
        '--chain-id',
        multisig.chainId,
        '--sign-mode',
        'amino-json',
        '--overwrite',
        '--output-document',
        signature.toString(),
      ]);
    return signature.readOnly();
  };

  const multisign = async (
    multisig: MultisigAccount,
    sequence: number,
    unsigned: FileRd,
    signatures: FileRd[],
  ) => {
    const file = root.join('signed.json');
    await agd
      .subCommand('tx')
      .subCommand('multisign')
      .exec([
        unsigned.toString(),
        multisig.name,
        ...signatures.map(sig => sig.toString()),
        '--offline',
        '--account-number',
        String(multisig.accountNumber),
        '--sequence',
        String(sequence),
        '--chain-id',
        multisig.chainId,
        '--output-document',
        file.toString(),
      ]);
    return file.readOnly();
  };

  return harden({
    addPubKey,
    addKey,
    makeMultisig,
    multisign,
    signAs,
    showPubKey,
  });
};

const makeSigner = (
  name: string,
  mnemonic: string,
  files: FileRW,
  tool: MultiSigTool,
): SignerActor => {
  const { addKey, addPubKey, makeMultisig, multisign, signAs, showPubKey } =
    tool;
  return harden({
    name,
    addKey: async () => {
      const source = files.join(`${name}.mnemonic.txt`);
      await source.writeText(mnemonic);
      await addKey(name, source.readOnly());
    },
    addPubKey,
    makeMultisig: async (memberPubKeys, threshold, msName = 'ymax-ms') => {
      const members = [name];
      for (const [index, pubkey] of memberPubKeys.entries()) {
        const memberName = `${msName}-member-${index + 1}`;
        await addPubKey(memberName, pubkey);
        members.push(memberName);
      }
      return makeMultisig(msName, members, threshold);
    },
    multisign: async (multisig, sequence, unsigned, signatures) => {
      const unsignedFile = await writeJson(
        files.join('unsigned.json'),
        unsigned,
      );
      return multisign(multisig, sequence, unsignedFile, signatures);
    },
    sign: async (multisig, sequence, unsigned) => {
      const unsignedFile = await writeJson(
        files.join(`${name}-unsigned.json`),
        unsigned,
      );
      return signAs(
        name,
        multisig,
        sequence,
        unsignedFile,
        files.join(`${name}-sig.json`),
      );
    },
    showPubKey: () => showPubKey(name),
  });
};

const checkControlAddress = async (
  t: ExecutionContext,
  contract: 'ymax0' | 'ymax1',
  net: 'devnet' | 'main',
  chainName: string,
) => {
  const upgradeRequestBuilder = makeUpgradeRequestBuilder({
    contract,
    networkConfig: { chainName, rpcAddrs: [] },
    queryClient: {
      getAccount: async () => ({
        accountNumber: 1,
        sequence: 7,
        pubkey: null,
      }),
    },
    walletKit: {
      marshaller: marshalData,
      agoricNames: { instance: { postalService: 'board0371' } },
    },
    clock: () => new Date('2026-06-26T17:39:38.685Z'),
  });
  const request = await upgradeRequestBuilder.generateUpgradeRequest({
    bundleId: tx1.upgradeArgs.bundleId,
    invocationId: tx1.invocationId,
    memo: '',
    overrides: tx1.upgradeArgs.privateArgsOverrides,
  });
  t.is(request.contract, contract);
  t.is(request.controlAddress, CONTROL_ADDRESSES[contract][net]);

  const unsigned = makeAgdUnsignedTx({
    bodyBytes: Buffer.from(request.bodyBytesBase64, 'base64'),
    authInfoBytes: Buffer.from(request.authInfoBytesBase64, 'base64'),
  });
  const spendMsg = unsigned.body.messages[0] as {
    '@type': string;
    owner: string;
  };
  t.is(spendMsg['@type'], MsgWalletSpendAction.typeUrl);
  t.is(spendMsg.owner, CONTROL_ADDRESSES[contract][net]);
};

test('generateUpgradeRequest resolves the ymax0 control address', async t => {
  await checkControlAddress(t, 'ymax0', 'devnet', 'agoricdev-25');
});

test('generateUpgradeRequest resolves the ymax1 control address', async t => {
  // Regression test: the unsigned tx's owner previously always resolved to
  // ymax0's control address regardless of target, because
  // generateUpgradeRequest hard-coded 'ymax0' instead of using the target's
  // actual contract.
  await checkControlAddress(t, 'ymax1', 'main', 'agoric-3');
});

test.serial('control upgrade supports more than one signer', async t => {
  const { env } = process;
  const commandRecords: CommandRecord[] = [];
  const recordingExecFile = makeRecordingExecFile(execFileP, commandRecords);
  const [aliceFiles, bobFiles] = await makeTestFiles(t, ['alice', 'bob']);

  const alice = makeSigner(
    'alice',
    'test test test test test test test test test test test junk',
    aliceFiles,
    makeMultiSigTool({ env, files: aliceFiles, execFile: recordingExecFile }),
  );
  const bob = makeSigner(
    'bob',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    bobFiles,
    makeMultiSigTool({ env, files: bobFiles, execFile: recordingExecFile }),
  );
  await alice.addKey();
  await bob.addKey();

  const control = await alice.makeMultisig([await bob.showPubKey()], 2);
  const multisig: MultisigAccount = {
    name: control.name,
    address: control.address,
    accountNumber: 123,
    chainId: tx1.chainId,
  };
  await bob.addPubKey(control.name, control.pubkey);

  const sequence = 456;
  const msg = makeUpgradeEncodeObject(tx1.upgradeArgs, {
    marshaller: marshalData,
    controlAddress: control.address,
    invocationId: tx1.invocationId,
  });
  const unsigned = await makeUnsignedAgdTx({
    controlPubkey: control.pubkey,
    msg,
    sequence,
  });
  const signatures = [
    await alice.sign(multisig, sequence, unsigned),
    await bob.sign(multisig, sequence, unsigned),
  ];
  const signed = await alice.multisign(
    multisig,
    sequence,
    unsigned,
    signatures,
  );

  await assertSignedSpendAction(t, msg, await signed.readText());
  t.snapshot(commandRecords, 'agd operator commands');
});

test.serial('authz grantee upgrade supports a multisig grantee', async t => {
  // Regression test for the production unsigned-tx generator
  // (makeUpgradeRequestBuilder/generateUpgradeRequest in ymax-authz-flow.ts):
  // when the authz grantee is a multisig account, the generated unsigned tx
  // must carry the grantee's real public key in auth_info.signer_infos[0],
  // or `agd tx multisign` panics with a nil pointer dereference (it
  // unconditionally reads signer_infos[0].public_key while verifying the
  // supplied signatures).
  const { env } = process;
  const commandRecords: CommandRecord[] = [];
  const recordingExecFile = makeRecordingExecFile(execFileP, commandRecords);
  const [aliceFiles, bobFiles] = await makeTestFiles(t, ['alice2', 'bob2']);

  const alice = makeSigner(
    'alice2',
    'test test test test test test test test test test test junk',
    aliceFiles,
    makeMultiSigTool({ env, files: aliceFiles, execFile: recordingExecFile }),
  );
  const bob = makeSigner(
    'bob2',
    'zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo zoo wrong',
    bobFiles,
    makeMultiSigTool({ env, files: bobFiles, execFile: recordingExecFile }),
  );
  await alice.addKey();
  await bob.addKey();

  const grantee = await alice.makeMultisig(
    [await bob.showPubKey()],
    2,
    'ymax-grantee-ms',
  );
  const multisig: MultisigAccount = {
    name: grantee.name,
    address: grantee.address,
    accountNumber: 789,
    chainId: tx1.chainId,
  };
  await bob.addPubKey(grantee.name, grantee.pubkey);

  const sequence = 12;
  let getAccountCalls = 0;
  const upgradeRequestBuilder = makeUpgradeRequestBuilder({
    contract: 'ymax1',
    networkConfig: { chainName: tx1.chainId, rpcAddrs: [] },
    // The grantee is given as a bare address here, as in normal operation
    // once the multisig has transacted at least once before; its public
    // key is resolved from the (mocked) on-chain account.
    grantee: grantee.address,
    queryClient: {
      getAccount: async () => {
        getAccountCalls += 1;
        return {
          accountNumber: multisig.accountNumber,
          sequence,
          pubkey: toAminoPubkey(grantee.pubkey),
        };
      },
    },
    walletKit: {
      marshaller: marshalData,
      agoricNames: { instance: { postalService: 'board0371' } },
    },
    clock: () => new Date('2026-06-26T17:39:38.685Z'),
  });
  const request = await upgradeRequestBuilder.generateUpgradeRequest({
    bundleId: tx1.upgradeArgs.bundleId,
    invocationId: tx1.invocationId,
    memo: '',
    overrides: tx1.upgradeArgs.privateArgsOverrides,
  });
  t.is(request.grantee, grantee.address);
  t.is(request.controlAddress, CONTROL_ADDRESSES.ymax1.devnet);
  // The grantee's pubkey and its account number/sequence both come from
  // this single lookup — resolving the grantee must not query twice.
  t.is(getAccountCalls, 1);

  const unsigned = makeAgdUnsignedTx({
    bodyBytes: Buffer.from(request.bodyBytesBase64, 'base64'),
    authInfoBytes: Buffer.from(request.authInfoBytesBase64, 'base64'),
  });
  t.deepEqual(
    unsigned.auth_info.signer_infos[0].public_key,
    JSON.parse(grantee.pubkey),
  );
  const execMsg = unsigned.body.messages[0] as {
    '@type': string;
    msgs: Array<{ '@type': string; owner: string }>;
  };
  t.is(execMsg['@type'], MsgExec.typeUrl);
  t.is(execMsg.msgs[0]['@type'], MsgWalletSpendAction.typeUrl);
  t.is(execMsg.msgs[0].owner, CONTROL_ADDRESSES.ymax1.devnet);

  const signatures = [
    await alice.sign(multisig, sequence, unsigned),
    await bob.sign(multisig, sequence, unsigned),
  ];
  const signed = await alice.multisign(
    multisig,
    sequence,
    unsigned,
    signatures,
  );

  const signedText = await signed.readText();
  const signedTxBytes = parseSignedTxBytes(signedText);
  const signedTx = TxRaw.decode(signedTxBytes);
  t.true(signedTx.signatures.length > 0);

  // Ground-truth check for combineDetachedGranteeSignatures: it must accept
  // these two real `agd tx sign --sign-mode=amino-json --multisig=...`
  // signatures, reproducing byte-for-byte what real `agd tx multisign`
  // produced above, without ever shelling out to agd itself.
  const signatureDescriptors = await Promise.all(
    signatures.map(async sig => JSON.parse(await sig.readText())),
  );
  const [aliceAddress, bobAddress] = await Promise.all(
    [alice, bob].map(async signer =>
      pubkeyToAddress(toAminoPubkey(await signer.showPubKey()), 'agoric'),
    ),
  );

  const notYetReady = await combineDetachedGranteeSignatures({
    unsignedTx: unsigned,
    chainId: multisig.chainId,
    getAccountNumber: async (address: string) => {
      t.is(address, grantee.address);
      return multisig.accountNumber;
    },
    signatureDescriptors: [signatureDescriptors[0]!],
  });
  t.deepEqual(notYetReady, {
    ready: false,
    reason: '1 of 2 required signatures collected',
  });

  const combined = await combineDetachedGranteeSignatures({
    unsignedTx: unsigned,
    chainId: multisig.chainId,
    getAccountNumber: async (address: string) => {
      t.is(address, grantee.address);
      return multisig.accountNumber;
    },
    signatureDescriptors,
  });
  if (!combined.ready) throw Error('expected combined.ready');
  t.deepEqual(
    new Set(combined.signedAddresses),
    new Set([aliceAddress, bobAddress]),
  );
  const recombinedBytes = parseSignedTxBytes(
    `${JSON.stringify(combined.signedTx)}\n`,
  );
  t.deepEqual(recombinedBytes, signedTxBytes);

  const tamperedSignature = JSON.parse(JSON.stringify(signatureDescriptors[1]));
  const originalSignatureBytes = Buffer.from(
    tamperedSignature.signatures[0].data.single.signature,
    'base64',
  );
  const tamperedSignatureBytes = Uint8Array.from(originalSignatureBytes);
  tamperedSignatureBytes[0] = (tamperedSignatureBytes[0]! + 1) % 256;
  tamperedSignature.signatures[0].data.single.signature = Buffer.from(
    tamperedSignatureBytes,
  ).toString('base64');
  await t.throwsAsync(
    combineDetachedGranteeSignatures({
      unsignedTx: unsigned,
      chainId: multisig.chainId,
      getAccountNumber: async (address: string) => {
        t.is(address, grantee.address);
        return multisig.accountNumber;
      },
      signatureDescriptors: [signatureDescriptors[0]!, tamperedSignature],
    }),
    { message: /does not verify against the unsigned tx/ },
  );
});

test('generateUpgradeRequest derives the grantee address from a pubkey input', async t => {
  const memberPubkeys = [
    '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"A43NKCA60Po/kXiKIsA2CKVERUMsRnRsmEB1T4pnHgS3"}',
    '{"@type":"/cosmos.crypto.secp256k1.PubKey","key":"Azb3Hn7YJIsE0NAnSN1HNnRQ/CQ8rQiJpxA1Bo8LS3bl"}',
  ];
  const granteePubkey = {
    '@type': '/cosmos.crypto.multisig.LegacyAminoPubKey',
    threshold: 2,
    public_keys: memberPubkeys.map(pk => JSON.parse(pk)),
  };
  const expectedAddress = pubkeyToAddress(
    decodePubkey(parseJsonPublicKey(granteePubkey) || assert.fail()),
    'agoric',
  );

  const getAccountCalledWith: string[] = [];
  const upgradeRequestBuilder = makeUpgradeRequestBuilder({
    contract: 'ymax1',
    networkConfig: { chainName: tx1.chainId, rpcAddrs: [] },
    // Never used before, so its address has no public key on chain yet:
    // give the pubkey directly instead of the address.
    grantee: JSON.stringify(granteePubkey),
    queryClient: {
      getAccount: async address => {
        getAccountCalledWith.push(address);
        // The account exists (e.g. already funded, for an account number)
        // but has no pubkey on record — irrelevant here since the pubkey
        // was already given directly.
        return { accountNumber: 1, sequence: 7, pubkey: null };
      },
    },
    walletKit: {
      marshaller: marshalData,
      agoricNames: { instance: { postalService: 'board0371' } },
    },
    clock: () => new Date('2026-06-26T17:39:38.685Z'),
  });
  const request = await upgradeRequestBuilder.generateUpgradeRequest({
    bundleId: tx1.upgradeArgs.bundleId,
    invocationId: tx1.invocationId,
    memo: '',
    overrides: tx1.upgradeArgs.privateArgsOverrides,
  });

  t.is(request.grantee, expectedAddress);
  // Exactly one lookup, for the derived address's account number/sequence
  // — the pubkey itself was already known, so it's never queried.
  t.deepEqual(getAccountCalledWith, [expectedAddress]);

  const unsigned = makeAgdUnsignedTx({
    bodyBytes: Buffer.from(request.bodyBytesBase64, 'base64'),
    authInfoBytes: Buffer.from(request.authInfoBytesBase64, 'base64'),
  });
  t.deepEqual(unsigned.auth_info.signer_infos[0].public_key, granteePubkey);
});

test('generateUpgradeRequest fails when a grantee address has no on-chain pubkey', async t => {
  const address = 'agoric1w376w9ws44d7l5cp7g5jjqn45mp5teldt5dhg9';
  const upgradeRequestBuilder = makeUpgradeRequestBuilder({
    contract: 'ymax1',
    networkConfig: { chainName: tx1.chainId, rpcAddrs: [] },
    grantee: address,
    queryClient: {
      // The account exists (e.g. it holds a balance) but has never sent a
      // transaction, so the chain has no record of its public key.
      getAccount: async () => ({ accountNumber: 1, sequence: 0, pubkey: null }),
    },
    walletKit: {
      marshaller: marshalData,
      agoricNames: { instance: { postalService: 'board0371' } },
    },
    clock: () => new Date('2026-06-26T17:39:38.685Z'),
  });

  await t.throwsAsync(
    upgradeRequestBuilder.generateUpgradeRequest({
      bundleId: tx1.upgradeArgs.bundleId,
      invocationId: tx1.invocationId,
      memo: '',
      overrides: tx1.upgradeArgs.privateArgsOverrides,
    }),
    {
      message: new RegExp(`^grantee "${address}" has no public key on chain`),
    },
  );
});
