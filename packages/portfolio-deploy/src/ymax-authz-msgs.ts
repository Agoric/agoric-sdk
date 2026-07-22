/** @file build and decode Cosmos messages and tx bytes for ymax authz workflows */
import type { start as YMaxStart } from '@aglocal/portfolio-contract/src/portfolio.contract.js';
import { MsgWalletSpendAction } from '@agoric/cosmic-proto/agoric/swingset/msgs.js';
import {
  GenericAuthorization,
  Grant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/authz.js';
import {
  MsgExec,
  MsgGrant,
} from '@agoric/cosmic-proto/codegen/cosmos/authz/v1beta1/tx.js';
import { LegacyAminoPubKey } from '@agoric/cosmic-proto/codegen/cosmos/crypto/multisig/keys.js';
import { CompactBitArray } from '@agoric/cosmic-proto/codegen/cosmos/crypto/multisig/v1beta1/multisig.js';
import { PubKey as Secp256k1PubKey } from '@agoric/cosmic-proto/codegen/cosmos/crypto/secp256k1/keys.js';
import { Any } from '@agoric/cosmic-proto/codegen/google/protobuf/any.js';
import {
  signModeFromJSON,
  signModeToJSON,
} from '@agoric/cosmic-proto/cosmos/tx/signing/v1beta1/signing.js';
import {
  AuthInfo,
  TxBody,
  TxRaw,
} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import type { ContractControl } from '@agoric/deploy-script-support/src/control/contract-control.contract.js';
import { fromBech32, toBech32 } from '@cosmjs/encoding';
import {
  Registry,
  type EncodeObject,
  type GeneratedType,
} from '@cosmjs/proto-signing';
import { defaultRegistryTypes } from '@cosmjs/stargate';
import { toAccAddress } from '@cosmjs/stargate/build/queryclient/utils.js';
import { WALLET_KEY } from './ymax-admin-helpers.ts';

type WalletAction<
  Method extends string = string,
  Args extends readonly unknown[] = readonly unknown[],
> = {
  method: 'invokeEntry';
  message: { id: string; targetName: string; method: Method; args: Args };
};

export const dateToTimestamp = (date: Date) => {
  const ms = date.getTime();
  return {
    seconds: BigInt(Math.floor(ms / 1000)),
    nanos: (ms % 1000) * 1_000_000,
  };
};

export const registry = new Registry([
  ...defaultRegistryTypes,
  [MsgWalletSpendAction.typeUrl, MsgWalletSpendAction as GeneratedType],
  [MsgGrant.typeUrl, MsgGrant as GeneratedType],
  [MsgExec.typeUrl, MsgExec as GeneratedType],
]);

export const makeGrantEncodeObject = ({
  granter,
  grantee,
  expiresAt,
}: {
  granter: string;
  grantee: string;
  expiresAt: Date;
}): EncodeObject => ({
  typeUrl: MsgGrant.typeUrl,
  value: MsgGrant.fromPartial({
    granter,
    grantee,
    grant: Grant.fromPartial({
      authorization: Any.fromPartial({
        typeUrl: GenericAuthorization.typeUrl,
        value: GenericAuthorization.encode(
          GenericAuthorization.fromPartial({
            msg: MsgWalletSpendAction.typeUrl,
          }),
        ).finish(),
      }),
      expiration: dateToTimestamp(expiresAt),
    }),
  }),
});

export const makeWalletActionBuilder = <T extends object>(
  targetName: string,
  id: string,
): {
  readonly [M in keyof T]: T[M] extends (...args: infer P) => unknown
    ? (...args: P) => WalletAction<M & string, P>
    : never;
} =>
  new Proxy(harden({}), {
    get(_target, prop) {
      if (typeof prop !== 'string') {
        return undefined;
      }
      return (...args: readonly unknown[]) =>
        harden({
          method: 'invokeEntry',
          message: { id, targetName, method: prop, args },
        });
    },
  }) as {
    readonly [M in keyof T]: T[M] extends (...args: infer P) => unknown
      ? (...args: P) => WalletAction<M & string, P>
      : never;
  };

export const makeUpgradeSpendAction = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  {
    marshaller,
    controlAddress,
    invocationId,
  }: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    invocationId: string;
  },
) => {
  const builder = makeWalletActionBuilder<ContractControl<typeof YMaxStart>>(
    WALLET_KEY,
    invocationId,
  );
  const action = builder.upgrade(upgradeArgs);
  const spendAction = JSON.stringify(marshaller.toCapData(action));
  return MsgWalletSpendAction.fromPartial({
    owner: toAccAddress(controlAddress),
    spendAction,
  });
};

export const makeUpgradeEncodeObject = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  opts: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    invocationId: string;
  },
): EncodeObject => ({
  typeUrl: MsgWalletSpendAction.typeUrl,
  value: makeUpgradeSpendAction(upgradeArgs, opts),
});

export const makeUpgradeExecEncodeObject = (
  upgradeArgs: {
    bundleId: string;
    privateArgsOverrides: Record<string, unknown>;
  },
  opts: {
    marshaller: { toCapData: (specimen: unknown) => unknown };
    controlAddress: string;
    grantee: string;
    invocationId: string;
  },
): EncodeObject => {
  const { grantee, ...rest } = opts;
  const msgSpend = makeUpgradeSpendAction(upgradeArgs, rest);
  return {
    typeUrl: MsgExec.typeUrl,
    value: MsgExec.fromPartial({
      grantee,
      msgs: [
        Any.fromPartial({
          typeUrl: MsgWalletSpendAction.typeUrl,
          value: MsgWalletSpendAction.encode(msgSpend).finish(),
        }),
      ],
    }),
  };
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

/** Inverse of {@link parseJsonPublicKey}: proto `Any` -> gRPC-gateway JSON. */
export const encodeJsonPublicKey = (publicKey?: {
  typeUrl: string;
  value: Uint8Array;
}): any => {
  if (!publicKey) {
    return undefined;
  }
  if (publicKey.typeUrl === Secp256k1PubKey.typeUrl) {
    const { key } = Secp256k1PubKey.decode(publicKey.value);
    return {
      '@type': Secp256k1PubKey.typeUrl,
      key: Buffer.from(key).toString('base64'),
    };
  }
  if (publicKey.typeUrl === LegacyAminoPubKey.typeUrl) {
    const { threshold, publicKeys } = LegacyAminoPubKey.decode(publicKey.value);
    return {
      '@type': LegacyAminoPubKey.typeUrl,
      threshold,
      public_keys: publicKeys.map(pk => encodeJsonPublicKey(pk)),
    };
  }
  throw Error(`unsupported public key type: ${publicKey.typeUrl}`);
};

export const parseJsonPublicKey = (publicKey: any) => {
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
    publicKey['@type'] === LegacyAminoPubKey.typeUrl &&
    Array.isArray(publicKey.public_keys)
  ) {
    return {
      typeUrl: LegacyAminoPubKey.typeUrl,
      value: LegacyAminoPubKey.encode({
        threshold: Number(publicKey.threshold || 0),
        publicKeys: publicKey.public_keys.map((pk: any) => {
          const parsed = parseJsonPublicKey(pk);
          if (!parsed) {
            throw Error('unsupported nested public_key shape in multisig key');
          }
          return Any.fromPartial(parsed);
        }),
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

const parseJsonModeInfo = (modeInfo: any) => {
  if (!modeInfo) {
    return undefined;
  }
  if (modeInfo.single) {
    return {
      single: {
        mode: signModeFromJSON(modeInfo.single.mode),
      },
    };
  }
  if (modeInfo.multi) {
    const { bitarray, mode_infos: modeInfos = [] } = modeInfo.multi;
    return {
      multi: {
        bitarray: bitarray
          ? CompactBitArray.fromPartial({
              extraBitsStored: Number(
                bitarray.extra_bits_stored ?? bitarray.extraBitsStored ?? 0,
              ),
              elems:
                typeof bitarray.elems === 'string'
                  ? Buffer.from(bitarray.elems, 'base64')
                  : typeof bitarray.elements === 'string'
                    ? Buffer.from(bitarray.elements, 'base64')
                    : new Uint8Array(),
            })
          : undefined,
        modeInfos: modeInfos.map((info: any) => {
          const parsed = parseJsonModeInfo(info);
          if (!parsed) {
            throw Error('unsupported nested mode_info in signed tx JSON');
          }
          return parsed;
        }),
      },
    };
  }
  throw Error('unsupported mode_info shape in signed tx JSON');
};

/** Inverse of {@link makeAgdUnsignedTx}'s `body`: gRPC-gateway JSON -> proto bytes. */
export const encodeTxBodyBytes = (body: any) =>
  TxBody.encode(
    TxBody.fromPartial({
      messages: (body.messages || []).map((message: any) =>
        encodeKnownMessage(message),
      ),
      memo: body.memo || '',
      timeoutHeight: BigInt(body.timeout_height || 0),
      extensionOptions: (body.extension_options || []).map((option: any) => ({
        typeUrl: option.type_url,
        value: Buffer.from(option.value, 'base64'),
      })),
      nonCriticalExtensionOptions: (
        body.non_critical_extension_options || []
      ).map((option: any) => ({
        typeUrl: option.type_url,
        value: Buffer.from(option.value, 'base64'),
      })),
    }),
  ).finish();

/** Inverse of {@link makeAgdUnsignedTx}'s `auth_info`: gRPC-gateway JSON -> proto bytes. */
export const encodeAuthInfoBytes = (authInfo: any) =>
  AuthInfo.encode(
    AuthInfo.fromPartial({
      signerInfos: (authInfo.signer_infos || []).map((info: any) => ({
        publicKey: parseJsonPublicKey(info.public_key),
        modeInfo: parseJsonModeInfo(info.mode_info),
        sequence: BigInt(info.sequence || 0),
      })),
      fee: authInfo.fee
        ? {
            amount: (authInfo.fee.amount || []).map((coin: any) => ({
              denom: coin.denom,
              amount: coin.amount,
            })),
            gasLimit: BigInt(authInfo.fee.gas_limit || 0),
            payer: authInfo.fee.payer || '',
            granter: authInfo.fee.granter || '',
          }
        : undefined,
    }),
  ).finish();

export const parseSignedTxBytes = (text: string) => {
  const specimen = JSON.parse(text) as any;
  if (
    !specimen?.body ||
    !specimen?.auth_info ||
    !Array.isArray(specimen?.signatures)
  ) {
    throw Error('not signed tx JSON');
  }
  return serializeSignedTx({
    bodyBytes: encodeTxBodyBytes(specimen.body),
    authInfoBytes: encodeAuthInfoBytes(specimen.auth_info),
    signatures: specimen.signatures.map((sig: string) =>
      Buffer.from(sig, 'base64'),
    ),
  });
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

/**
 * Convert a message already decoded into {@link decodeKnownMessage}'s
 * gRPC-gateway JSON shape into its Amino JSON form, recursively for
 * `MsgExec`'s nested messages — needed to reconstruct the exact
 * `SIGN_MODE_LEGACY_AMINO_JSON` sign bytes for verifying detached
 * signatures. cosmjs's `AminoTypes` deliberately leaves `MsgExec` and other
 * authz messages unimplemented (see `@cosmjs/stargate`'s
 * `createAuthzAminoConverters`), and although `@agoric/cosmic-proto`'s
 * generated codecs carry an `aminoType` name (used below), none of them
 * implement the `toAminoMsg`/`fromAminoMsg` conversion `Registry.toAmino`
 * would dispatch to — so there's no existing converter to reuse, just the
 * canonical type-name constants.
 *
 * Field key order doesn't matter here: both `agd` (via `sdk.MustSortJSON`)
 * and cosmjs's `serializeSignDoc` (via `sortedJsonStringify`) canonicalize
 * by recursively sorting object keys before hashing, so only the key names
 * and value encodings need to match.
 */
export const toAminoMsg = (message: any): { type: string; value: any } => {
  switch (message['@type']) {
    case MsgExec.typeUrl:
      return {
        type: MsgExec.aminoType,
        value: {
          grantee: message.grantee,
          msgs: message.msgs.map((nested: any) => toAminoMsg(nested)),
        },
      };
    case MsgWalletSpendAction.typeUrl:
      return {
        type: MsgWalletSpendAction.aminoType,
        value: {
          owner: message.owner,
          spend_action: message.spend_action,
        },
      };
    default:
      throw Error(
        `unsupported message type for amino signing: ${message['@type']}`,
      );
  }
};

/** Inverse of {@link parseJsonModeInfo}: proto ModeInfo -> gRPC-gateway JSON. */
const encodeModeInfoJson = (modeInfo: any): any => {
  if (modeInfo.single) {
    return { single: { mode: signModeToJSON(modeInfo.single.mode) } };
  }
  if (modeInfo.multi) {
    return {
      multi: {
        ...(modeInfo.multi.bitarray
          ? {
              bitarray: {
                extra_bits_stored: modeInfo.multi.bitarray.extraBitsStored,
                elems: Buffer.from(modeInfo.multi.bitarray.elems).toString(
                  'base64',
                ),
              },
            }
          : {}),
        mode_infos: modeInfo.multi.modeInfos.map((info: any) =>
          encodeModeInfoJson(info),
        ),
      },
    };
  }
  throw Error('unsupported mode_info shape when encoding tx JSON');
};

const encodeTxToJson = ({
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
          ? { public_key: encodeJsonPublicKey(info.publicKey) }
          : {}),
        ...(info.modeInfo
          ? { mode_info: encodeModeInfoJson(info.modeInfo) }
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
  };
};

export const makeAgdUnsignedTx = ({
  bodyBytes,
  authInfoBytes,
}: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
}) => ({
  ...encodeTxToJson({ bodyBytes, authInfoBytes }),
  signatures: [],
});

/** Same gRPC-gateway JSON shape as {@link makeAgdUnsignedTx}, but with real signatures attached. */
export const makeAgdSignedTx = ({
  bodyBytes,
  authInfoBytes,
  signatures,
}: {
  bodyBytes: Uint8Array;
  authInfoBytes: Uint8Array;
  signatures: readonly Uint8Array[];
}) => ({
  ...encodeTxToJson({ bodyBytes, authInfoBytes }),
  signatures: signatures.map(sig => Buffer.from(sig).toString('base64')),
});
