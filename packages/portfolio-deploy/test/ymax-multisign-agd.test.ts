/** @file test agd-compatible multisign flows for ymax upgrade transactions */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { execFile as execFileCb } from 'node:child_process';
import * as fsp from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import { TxBody, TxRaw } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { makeCmdRunner, makeFileRW } from '@agoric/pola-io';
import { makeAuthInfoBytes, type EncodeObject } from '@cosmjs/proto-signing';
import type { ExecutionContext } from 'ava';
import { promisify } from 'node:util';
import {
  makeAgdUnsignedTx,
  makeUpgradeEncodeObject,
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
