/* eslint-disable @jessie.js/safe-await-separator */
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { PubKey as Secp256k1PubKey } from '@agoric/cosmic-proto/codegen/cosmos/crypto/secp256k1/keys.js';
import {
  signModeFromJSON,
  signModeToJSON,
} from '@agoric/cosmic-proto/cosmos/tx/signing/v1beta1/signing.js';
import {
  AuthInfo,
  TxBody,
  TxRaw,
} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import { fromBech32, toBech32 } from '@cosmjs/encoding';
import {
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
  Registry,
  type EncodeObject,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import {
  defaultRegistryTypes,
  type SignerData,
  type StdFee,
} from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { createHash } from 'node:crypto';
import { parseArgs } from 'node:util';
import { netOfConfig } from './ymax-admin-helpers.ts';
import {
  makeGrantEncodeObject,
  makeUpgradeEncodeObject,
  makeUpgradeExecEncodeObject,
} from './ymax-authz-msgs.ts';

export const usage = `Usage:
  ymax-authz.ts grant --grantee <address> [--hours 4] [--outfile <file>]
  ymax-authz.ts generate-upgrade --grantee <address> --bundle <bundleId> [--overrides <file>] [--invocation-id <id>] [--outfile <file>] [--signing-file <file>]
  ymax-authz.ts broadcast --tx-file <file> [--signature-file <file>] [--outfile <file>]`;

export const defaultContract = 'ymax0';
export const authzGrantKind = 'ymax-authz-grant';
export const unsignedUpgradeKind = 'ymax-authz-upgrade-request' as const;
export const signedUpgradeKind = 'ymax-authz-upgrade' as const;

export const defaultFee: StdFee = {
  gas: '400000',
  amount: [{ denom: 'ubld', amount: '10000' }],
};

export const registry = new Registry([
  ...defaultRegistryTypes,
  [MsgWalletSpendAction.typeUrl, MsgWalletSpendAction as GeneratedType],
  [MsgGrant.typeUrl, MsgGrant as GeneratedType],
  [MsgExec.typeUrl, MsgExec as GeneratedType],
]);

export type FileRW = {
  join(path: string): FileRW;
  readOnly(): FileRd;
  writeText(text: string): Promise<void>;
  toString(): string;
};

export type FileRd = {
  join(path: string): FileRd;
  readText(): Promise<string>;
  toString(): string;
};

export type Clock = () => Date;

export type Command =
  | {
      kind: 'grant';
      grantee: string;
      hours: number;
      memo: string;
      mnemonic: string;
      outfile?: FileRW;
    }
  | {
      kind: 'generate-upgrade';
      grantee: string;
      bundleId: string;
      invocationId: string;
      memo: string;
      overrides?: FileRd;
      outfile?: FileRW;
      signingFile?: FileRW;
    }
  | {
      kind: 'broadcast';
      txFile: FileRd;
      signatureFile?: FileRd;
      outfile?: FileRW;
    };

export type GrantArtifact = {
  kind: typeof authzGrantKind;
  granter: string;
  grantee: string;
  expiresAt: string;
  txHash: string;
  height: number;
};

export type UnsignedUpgradeArtifact = {
  kind: typeof unsignedUpgradeKind;
  contract: typeof defaultContract;
  controlAddress: string;
  grantee?: string;
  bundleId: string;
  invocationId: string;
  chainId: string;
  bodyBytesBase64: string;
  authInfoBytesBase64: string;
  signBytesBase64: string;
  signBytesSha256: string;
  signerData: SignerData;
  createdAt: string;
  memo: string;
  overridesPath?: string;
};

export type SignedUpgradeArtifact = {
  kind: typeof signedUpgradeKind;
  contract: typeof defaultContract;
  controlAddress: string;
  grantee?: string;
  bundleId: string;
  invocationId: string;
  chainId: string;
  txBytesBase64: string;
  txBytesSha256: string;
  signerData: SignerData;
  createdAt: string;
  memo: string;
  overridesPath?: string;
};

export type BroadcastArtifact = SignedUpgradeArtifact & {
  txHash: string;
  height: number;
};

type TxResult = {
  transactionHash: string;
  height: number;
};

export type NetworkConfigShape = {
  chainName: string;
  rpcAddrs: string[];
};

export type SignerClient = {
  getSequence(address: string): Promise<{
    accountNumber: number;
    sequence: number;
  }>;
  sign(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
    signerData: SignerData,
  ): Promise<{
    bodyBytes: Uint8Array;
    authInfoBytes: Uint8Array;
    signatures: readonly Uint8Array[];
  }>;
  signAndBroadcast(
    signerAddress: string,
    messages: readonly EncodeObject[],
    fee: StdFee,
    memo: string,
  ): Promise<TxResult>;
};

export type RpcClient = {
  getSequence(address: string): Promise<{
    accountNumber: number;
    sequence: number;
  }>;
  broadcastTx(txBytes: Uint8Array): Promise<TxResult>;
};

export type WalletKitShape = {
  marshaller: {
    toCapData(specimen: unknown): unknown;
  };
  agoricNames: {
    instance: {
      postalService?: unknown;
    };
  };
};

export type SignerKit = {
  address: string;
  client: SignerClient;
};

const requireString = (
  specimen: string | boolean | undefined,
  name: string,
): string => {
  if (typeof specimen !== 'string' || !specimen) {
    throw Error(`missing --${name}`);
  }
  return specimen;
};

export const parseCommand = (
  argv: string[],
  files: FileRW,
  env: typeof process.env,
  clock: Clock,
): Command => {
  const readOnlyFiles = files.readOnly();
  const [subcommand, ...rest] = argv.slice(2);
  if (!subcommand) throw Error(usage);
  const { values } = parseArgs({
    args: rest,
    options: {
      bundle: { type: 'string' },
      grantee: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
      hours: { type: 'string', default: '4' },
      'invocation-id': { type: 'string' },
      memo: { type: 'string', default: '' },
      outfile: { type: 'string' },
      overrides: { type: 'string' },
      'signing-file': { type: 'string' },
      'signature-file': { type: 'string' },
      'tx-file': { type: 'string' },
    },
  });
  if (values.help) throw Error(usage);
  switch (subcommand) {
    case 'grant':
      return {
        kind: 'grant',
        grantee: requireString(values.grantee, 'grantee'),
        hours: Number.parseInt(requireString(values.hours, 'hours'), 10),
        memo: typeof values.memo === 'string' ? values.memo : '',
        mnemonic:
          env.GRANTER_MNEMONIC ||
          env.MNEMONIC ||
          Fail`GRANTER_MNEMONIC or MNEMONIC must be set`,
        outfile:
          typeof values.outfile === 'string'
            ? files.join(values.outfile)
            : undefined,
      };
    case 'generate-upgrade':
      return {
        kind: 'generate-upgrade',
        grantee:
          (typeof values.grantee === 'string' && values.grantee) ||
          env.GRANTEE_ADDRESS ||
          Fail`--grantee or GRANTEE_ADDRESS must be set`,
        bundleId: requireString(values.bundle, 'bundle'),
        invocationId:
          typeof values['invocation-id'] === 'string'
            ? values['invocation-id']
            : `${defaultContract}-${clock().toISOString()}`,
        memo: typeof values.memo === 'string' ? values.memo : '',
        overrides:
          typeof values.overrides === 'string'
            ? readOnlyFiles.join(values.overrides)
            : undefined,
        outfile:
          typeof values.outfile === 'string'
            ? files.join(values.outfile)
            : undefined,
        signingFile:
          typeof values['signing-file'] === 'string'
            ? files.join(values['signing-file'])
            : undefined,
      };
    case 'broadcast':
      return {
        kind: 'broadcast',
        txFile: readOnlyFiles.join(requireString(values['tx-file'], 'tx-file')),
        signatureFile:
          typeof values['signature-file'] === 'string'
            ? readOnlyFiles.join(values['signature-file'])
            : undefined,
        outfile:
          typeof values.outfile === 'string'
            ? files.join(values.outfile)
            : undefined,
      };
    default:
      throw Error(`${usage}\nunknown subcommand: ${subcommand}`);
  }
};

export const formatJson = (specimen: unknown) =>
  `${JSON.stringify(specimen, null, 2)}\n`;

export const readOverrides = async (file: FileRd | undefined) =>
  file ? (JSON.parse(await file.readText()) as object) || {} : {};

export const parseSignedUpgradeArtifact = (
  text: string,
): SignedUpgradeArtifact => {
  const specimen = JSON.parse(text) as SignedUpgradeArtifact;
  if (specimen.kind !== signedUpgradeKind) {
    throw Error(`unexpected tx file kind: ${String((specimen as any).kind)}`);
  }
  return specimen;
};

export const isSignedUpgradeArtifact = (
  specimen: unknown,
): specimen is SignedUpgradeArtifact =>
  !!specimen &&
  typeof specimen === 'object' &&
  (specimen as { kind?: unknown }).kind === signedUpgradeKind;

export const parseUnsignedUpgradeArtifact = (
  text: string,
): UnsignedUpgradeArtifact => {
  const specimen = JSON.parse(text) as UnsignedUpgradeArtifact;
  if (specimen.kind !== unsignedUpgradeKind) {
    throw Error(`unexpected tx file kind: ${String((specimen as any).kind)}`);
  }
  return specimen;
};

export const serializeSignedTx = (signedTx: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: readonly Uint8Array[];
}) =>
  TxRaw.encode({
    ...signedTx,
    signatures: [...signedTx.signatures],
  }).finish();

export const assembleSignedTxBytes = ({
  bodyBytes,
  authInfoBytes,
  signature,
}: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signature: Uint8Array;
}) =>
  serializeSignedTx({
    bodyBytes,
    authInfoBytes,
    signatures: [signature],
  });

export const readSignatureBytes = async (file: FileRd) => {
  const text = (await file.readText()).trim();
  try {
    const specimen = JSON.parse(text) as
      | { signatureBase64?: string; signatures?: string[] }
      | undefined;
    if (typeof specimen?.signatureBase64 === 'string') {
      return Buffer.from(specimen.signatureBase64, 'base64');
    }
    if (typeof specimen?.signatures?.[0] === 'string') {
      return Buffer.from(specimen.signatures[0], 'base64');
    }
  } catch {
    // treat the input as a plain base64 string
  }
  return Buffer.from(text, 'base64');
};

const encodeKnownMessage = (
  message: any,
): { typeUrl: string; value: Uint8Array } => {
  switch (message?.['@type']) {
    case MsgExec.typeUrl:
      return {
        typeUrl: MsgExec.typeUrl,
        value: MsgExec.encode(
          MsgExec.fromPartial({
            grantee: message.grantee,
            msgs: (message.msgs || []).map((nested: any) =>
              encodeKnownMessage(nested),
            ),
          }),
        ).finish(),
      };
    case MsgWalletSpendAction.typeUrl:
      return {
        typeUrl: MsgWalletSpendAction.typeUrl,
        value: MsgWalletSpendAction.encode(
          MsgWalletSpendAction.fromPartial({
            owner: fromBech32(message.owner).data,
            spendAction: message.spend_action || message.spendAction || '',
          }),
        ).finish(),
      };
    default:
      if (
        typeof message?.['@type'] === 'string' &&
        typeof message?.value === 'string'
      ) {
        return {
          typeUrl: message['@type'],
          value: Buffer.from(message.value, 'base64'),
        };
      }
      throw Error(
        `unsupported message type in signed tx JSON: ${String(message?.['@type'])}`,
      );
  }
};

const parseJsonPublicKey = (publicKey: any) => {
  if (!publicKey) {
    return undefined;
  }
  if (
    publicKey['@type'] === Secp256k1PubKey.typeUrl &&
    typeof publicKey.key === 'string'
  ) {
    return {
      typeUrl: Secp256k1PubKey.typeUrl,
      value: Secp256k1PubKey.encode({
        key: Buffer.from(publicKey.key, 'base64'),
      }).finish(),
    };
  }
  if (
    typeof publicKey.type_url === 'string' &&
    typeof publicKey.value === 'string'
  ) {
    return {
      typeUrl: publicKey.type_url,
      value: Buffer.from(publicKey.value, 'base64'),
    };
  }
  throw Error('unsupported public_key shape in signed tx JSON');
};

export const parseSignedTxBytes = (text: string) => {
  const specimen = JSON.parse(text) as any;
  if (
    !specimen?.body ||
    !specimen?.auth_info ||
    !Array.isArray(specimen?.signatures)
  ) {
    throw Error('not signed tx JSON');
  }
  const bodyBytes = TxBody.encode(
    TxBody.fromPartial({
      messages: (specimen.body.messages || []).map((message: any) =>
        encodeKnownMessage(message),
      ),
      memo: specimen.body.memo || '',
      timeoutHeight: BigInt(specimen.body.timeout_height || 0),
      extensionOptions: (specimen.body.extension_options || []).map(
        (option: any) => ({
          typeUrl: option.type_url,
          value: Buffer.from(option.value, 'base64'),
        }),
      ),
      nonCriticalExtensionOptions: (
        specimen.body.non_critical_extension_options || []
      ).map((option: any) => ({
        typeUrl: option.type_url,
        value: Buffer.from(option.value, 'base64'),
      })),
    }),
  ).finish();
  const authInfoBytes = AuthInfo.encode(
    AuthInfo.fromPartial({
      signerInfos: (specimen.auth_info.signer_infos || []).map((info: any) => ({
        publicKey: parseJsonPublicKey(info.public_key),
        modeInfo: info.mode_info?.single
          ? {
              single: {
                mode: signModeFromJSON(info.mode_info.single.mode),
              },
            }
          : undefined,
        sequence: BigInt(info.sequence || 0),
      })),
      fee: specimen.auth_info.fee
        ? {
            amount: (specimen.auth_info.fee.amount || []).map((coin: any) => ({
              denom: coin.denom,
              amount: coin.amount,
            })),
            gasLimit: BigInt(specimen.auth_info.fee.gas_limit || 0),
            payer: specimen.auth_info.fee.payer || '',
            granter: specimen.auth_info.fee.granter || '',
          }
        : undefined,
    }),
  ).finish();
  return serializeSignedTx({
    bodyBytes,
    authInfoBytes,
    signatures: specimen.signatures.map((sig: string) =>
      Buffer.from(sig, 'base64'),
    ),
  });
};

export const makeUnsignedUpgradeArtifact = ({
  contract,
  controlAddress,
  grantee,
  bundleId,
  invocationId,
  chainId,
  bodyBytes,
  authInfoBytes,
  signerData,
  createdAt,
  memo,
  overridesPath,
}: {
  contract: typeof defaultContract;
  controlAddress: string;
  grantee?: string;
  bundleId: string;
  invocationId: string;
  chainId: string;
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signerData: SignerData;
  createdAt: string;
  memo: string;
  overridesPath?: string;
}): UnsignedUpgradeArtifact => {
  const signBytes = makeSignBytes(
    makeSignDoc(bodyBytes, authInfoBytes, chainId, signerData.accountNumber),
  );
  return {
    kind: unsignedUpgradeKind,
    contract,
    controlAddress,
    grantee,
    bundleId,
    invocationId,
    chainId,
    bodyBytesBase64: Buffer.from(bodyBytes).toString('base64'),
    authInfoBytesBase64: Buffer.from(authInfoBytes).toString('base64'),
    signBytesBase64: Buffer.from(signBytes).toString('base64'),
    signBytesSha256: createHash('sha256').update(signBytes).digest('hex'),
    signerData,
    createdAt,
    memo,
    overridesPath,
  };
};

const bytesEqualBase64 = (aBase64: string, bBase64: string) => {
  // TODO use @endo/base64 when we want to avoid Node's Buffer API here.
  const a = Buffer.from(aBase64, 'base64');
  const b = Buffer.from(bBase64, 'base64');
  return a.length === b.length && a.every((byte, i) => byte === b[i]);
};

const comparableAuthInfo = (authInfoBytesBase64: string) => {
  const authInfo = AuthInfo.decode(Buffer.from(authInfoBytesBase64, 'base64'));
  return {
    fee: authInfo.fee
      ? {
          amount: authInfo.fee.amount.map(({ denom, amount }) => ({
            denom,
            amount,
          })),
          gasLimit: authInfo.fee.gasLimit.toString(),
          payer: authInfo.fee.payer,
          granter: authInfo.fee.granter,
        }
      : undefined,
    signerInfos: authInfo.signerInfos.map(info => ({
      mode: info.modeInfo?.single?.mode,
      sequence: info.sequence.toString(),
    })),
  };
};

const assertSignedTxMatchesRequest = (
  request: UnsignedUpgradeArtifact,
  txBytes: Uint8Array,
) => {
  const signedTx = TxRaw.decode(txBytes);
  const signedBodyBytesBase64 = Buffer.from(signedTx.bodyBytes).toString(
    'base64',
  );
  const signedAuthInfoBytesBase64 = Buffer.from(
    signedTx.authInfoBytes,
  ).toString('base64');
  if (!bytesEqualBase64(request.bodyBytesBase64, signedBodyBytesBase64)) {
    throw Error('signed tx body does not match unsigned request');
  }
  if (
    JSON.stringify(comparableAuthInfo(request.authInfoBytesBase64)) !==
    JSON.stringify(comparableAuthInfo(signedAuthInfoBytesBase64))
  ) {
    throw Error('signed tx authInfo does not match unsigned request');
  }
};

const decodeKnownMessage = ({
  typeUrl,
  value,
}: {
  typeUrl: string;
  value: Uint8Array;
}) => {
  switch (typeUrl) {
    case MsgExec.typeUrl: {
      const decoded = MsgExec.decode(value);
      return {
        '@type': typeUrl,
        grantee: decoded.grantee,
        msgs: decoded.msgs.map(message => decodeKnownMessage(message)),
      };
    }
    case MsgWalletSpendAction.typeUrl: {
      const decoded = MsgWalletSpendAction.decode(value);
      return {
        '@type': typeUrl,
        owner: toBech32('agoric', decoded.owner),
        spend_action: decoded.spendAction,
      };
    }
    default:
      return {
        '@type': typeUrl,
        value: Buffer.from(value).toString('base64'),
      };
  }
};

export const makeAgdUnsignedTx = ({
  bodyBytes,
  authInfoBytes,
}: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
}) => {
  const body = TxBody.decode(bodyBytes);
  const authInfo = AuthInfo.decode(authInfoBytes);
  return {
    body: {
      messages: body.messages.map(message => decodeKnownMessage(message)),
      memo: body.memo,
      timeout_height: body.timeoutHeight.toString(),
      extension_options: body.extensionOptions.map(option => ({
        type_url: option.typeUrl,
        value: Buffer.from(option.value).toString('base64'),
      })),
      non_critical_extension_options: body.nonCriticalExtensionOptions.map(
        option => ({
          type_url: option.typeUrl,
          value: Buffer.from(option.value).toString('base64'),
        }),
      ),
    },
    auth_info: {
      signer_infos: authInfo.signerInfos.map(info => ({
        ...(info.publicKey
          ? {
              public_key: {
                type_url: info.publicKey.typeUrl,
                value: Buffer.from(info.publicKey.value).toString('base64'),
              },
            }
          : {}),
        ...(info.modeInfo
          ? {
              mode_info: {
                ...(info.modeInfo.single
                  ? {
                      single: {
                        mode: signModeToJSON(info.modeInfo.single.mode),
                      },
                    }
                  : {}),
              },
            }
          : {}),
        sequence: info.sequence.toString(),
      })),
      fee: authInfo.fee
        ? {
            amount: authInfo.fee.amount.map(({ denom, amount }) => ({
              denom,
              amount,
            })),
            gas_limit: authInfo.fee.gasLimit.toString(),
            payer: authInfo.fee.payer,
            granter: authInfo.fee.granter,
          }
        : undefined,
    },
    signatures: [],
  };
};

export const makeSignedUpgradeArtifact = ({
  request,
  signature,
}: {
  request: UnsignedUpgradeArtifact;
  signature: Uint8Array;
}): SignedUpgradeArtifact => {
  const txBytes = assembleSignedTxBytes({
    bodyBytes: Buffer.from(request.bodyBytesBase64, 'base64'),
    authInfoBytes: Buffer.from(request.authInfoBytesBase64, 'base64'),
    signature,
  });
  return {
    kind: signedUpgradeKind,
    contract: request.contract,
    controlAddress: request.controlAddress,
    ...(request.grantee ? { grantee: request.grantee } : {}),
    bundleId: request.bundleId,
    invocationId: request.invocationId,
    chainId: request.chainId,
    txBytesBase64: Buffer.from(txBytes).toString('base64'),
    txBytesSha256: createHash('sha256').update(txBytes).digest('hex'),
    signerData: request.signerData,
    createdAt: request.createdAt,
    memo: request.memo,
    overridesPath: request.overridesPath,
  };
};

export const makeBroadcastArtifact = (
  signedArtifact: SignedUpgradeArtifact,
  tx: TxResult,
): BroadcastArtifact => ({
  ...signedArtifact,
  txHash: tx.transactionHash,
  height: tx.height,
});

export const makeGrantor = ({
  signerKit,
  clock,
}: {
  signerKit: SignerKit;
  clock: Clock;
}) =>
  harden({
    async grant({
      grantee,
      hours,
      memo,
    }: {
      grantee: string;
      hours: number;
      memo: string;
    }): Promise<GrantArtifact> {
      const { address, client } = signerKit;
      const expiresAt = new Date(clock().getTime() + hours * 60 * 60 * 1000);
      const grantMsg = makeGrantEncodeObject({
        granter: address,
        grantee,
        expiresAt,
      });
      const tx = await client.signAndBroadcast(
        address,
        [grantMsg],
        defaultFee,
        memo,
      );
      return {
        kind: authzGrantKind,
        granter: address,
        grantee,
        expiresAt: expiresAt.toISOString(),
        txHash: tx.transactionHash,
        height: tx.height,
      };
    },
  });

export const makeUpgradeSigner = ({
  networkConfig,
  grantee,
  queryClient,
  walletKit,
  clock,
}: {
  networkConfig: NetworkConfigShape;
  grantee?: string;
  queryClient: Pick<RpcClient, 'getSequence'>;
  walletKit: WalletKitShape;
  clock: Clock;
}) =>
  harden({
    async signUpgrade({
      bundleId,
      invocationId,
      memo,
      overrides,
      overridesPath,
    }: {
      bundleId: string;
      invocationId: string;
      memo: string;
      overrides: object;
      overridesPath?: string;
    }): Promise<UnsignedUpgradeArtifact> {
      const net = netOfConfig(networkConfig);
      const controlAddress = CONTROL_ADDRESSES[defaultContract][net];
      const { postalService } = walletKit.agoricNames.instance;
      postalService || Fail`missing postalService instance in agoricNames`;
      const privateArgsOverrides = harden({
        ...overrides,
        postalServiceInstance: postalService,
      });
      const signerAddress = grantee || controlAddress;
      const txMsg = grantee
        ? makeUpgradeExecEncodeObject(
            {
              bundleId,
              privateArgsOverrides,
            },
            {
              marshaller: walletKit.marshaller,
              controlAddress,
              grantee,
              invocationId,
            },
          )
        : makeUpgradeEncodeObject(
            {
              bundleId,
              privateArgsOverrides,
            },
            {
              marshaller: walletKit.marshaller,
              controlAddress,
              invocationId,
            },
          );
      const { accountNumber, sequence } =
        await queryClient.getSequence(signerAddress);
      const signerData: SignerData = {
        accountNumber,
        sequence,
        chainId: networkConfig.chainName,
      };
      const bodyBytes = registry.encodeTxBody({
        messages: [txMsg],
        memo,
      });
      const authInfoBytes = makeAuthInfoBytes(
        [{ pubkey: undefined as never, sequence }],
        defaultFee.amount,
        Number(defaultFee.gas),
        undefined,
        undefined,
      );
      return makeUnsignedUpgradeArtifact({
        contract: defaultContract,
        controlAddress,
        ...(grantee ? { grantee } : {}),
        bundleId,
        invocationId,
        chainId: networkConfig.chainName,
        bodyBytes,
        authInfoBytes,
        signerData,
        createdAt: clock().toISOString(),
        memo,
        overridesPath,
      });
    },
  });

export const makeTxBroadcaster = ({
  connectRpc,
  rpcAddr,
}: {
  connectRpc: (rpcAddr: string) => Promise<RpcClient>;
  rpcAddr: string;
}) =>
  harden({
    async broadcast(
      signedArtifact: SignedUpgradeArtifact,
    ): Promise<BroadcastArtifact> {
      const client = await connectRpc(rpcAddr);
      const txBytes = Buffer.from(signedArtifact.txBytesBase64, 'base64');
      const tx = await client.broadcastTx(txBytes);
      return makeBroadcastArtifact(signedArtifact, tx);
    },
  });

export const makeBroadcastArtifactFromFiles = async ({
  txText,
  signatureFile,
  broadcaster,
}: {
  txText: string;
  signatureFile: FileRd | undefined;
  broadcaster: ReturnType<typeof makeTxBroadcaster>;
}): Promise<BroadcastArtifact> => {
  const parsed = JSON.parse(txText) as
    | SignedUpgradeArtifact
    | UnsignedUpgradeArtifact;
  if (isSignedUpgradeArtifact(parsed)) {
    return broadcaster.broadcast(parsed);
  }
  if (parsed.kind !== unsignedUpgradeKind) {
    throw Error(`unexpected tx file kind: ${String((parsed as any).kind)}`);
  }
  if (!signatureFile) {
    throw Error('--signature-file is required for unsigned upgrade requests');
  }
  const signatureText = await signatureFile.readText();
  let txBytes: Uint8Array | undefined;
  try {
    txBytes = parseSignedTxBytes(signatureText);
  } catch {
    // fall back to detached signature input
  }
  if (txBytes) {
    assertSignedTxMatchesRequest(parsed, txBytes);
    const signedArtifact = {
      kind: signedUpgradeKind,
      contract: parsed.contract,
      controlAddress: parsed.controlAddress,
      ...(parsed.grantee ? { grantee: parsed.grantee } : {}),
      bundleId: parsed.bundleId,
      invocationId: parsed.invocationId,
      chainId: parsed.chainId,
      txBytesBase64: Buffer.from(txBytes).toString('base64'),
      txBytesSha256: createHash('sha256').update(txBytes).digest('hex'),
      signerData: parsed.signerData,
      createdAt: parsed.createdAt,
      memo: parsed.memo,
      overridesPath: parsed.overridesPath,
    };
    return broadcaster.broadcast(signedArtifact);
  }
  const signedArtifact = makeSignedUpgradeArtifact({
    request: parsed,
    signature: await readSignatureBytes(signatureFile),
  });
  return broadcaster.broadcast(signedArtifact);
};
