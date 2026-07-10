/** @file build unsigned ymax upgrade requests for release workflows */
/* eslint-disable @jessie.js/safe-await-separator */
import { LegacyAminoPubKey } from '@agoric/cosmic-proto/codegen/cosmos/crypto/multisig/keys.js';
import { PubKey as Secp256k1PubKeyProto } from '@agoric/cosmic-proto/codegen/cosmos/crypto/secp256k1/keys.js';
import {
  CONTROL_ADDRESSES,
  PORTFOLIO_CONTRACT_NAMES,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import {
  makeSignDoc as makeAminoSignDoc,
  pubkeyToAddress,
  serializeSignDoc,
  type MultisigThresholdPubkey,
  type Pubkey,
} from '@cosmjs/amino';
import { Secp256k1, Secp256k1Signature, sha256 } from '@cosmjs/crypto';
import {
  decodePubkey,
  encodePubkey,
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
} from '@cosmjs/proto-signing';
import {
  makeMultisignedTx,
  type SignerData,
  type StdFee,
} from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { createHash } from 'node:crypto';
import { netOfConfig } from './ymax-admin-helpers.ts';
import {
  encodeTxBodyBytes,
  makeAgdSignedTx,
  makeUpgradeEncodeObject,
  makeUpgradeExecEncodeObject,
  parseJsonPublicKey,
  registry,
  toAminoMsg,
} from './ymax-authz-msgs.ts';

export type ContractName = (typeof PORTFOLIO_CONTRACT_NAMES)[number];
const unsignedUpgradeKind = 'ymax-authz-upgrade-request' as const;

/**
 * Derives fee from gas so the two can never drift apart (e.g. bumping gas
 * for a bigger tx without bumping the fee to match, which under-pays and
 * gets rejected with `insufficient fees`).
 */
const makeFee = ({
  gas,
  price = 0.03, // 0.025 observed on mainnet, plus some headroom
  denom = 'ubld', // price is in this denom
}: {
  gas: number;
  price?: number;
  denom?: string;
}): StdFee => ({
  gas: `${Math.round(gas)}`,
  amount: [{ denom, amount: `${Math.round(gas * price)}` }],
});

// 800_000: an authz-wrapped upgrade tx (MsgExec, and for a multisig grantee
// a larger AuthInfo with multiple member pubkeys/signatures) is bigger than
// the plain single-signer WalletSpendAction this budget was originally
// sized for, so it needs more gas just for tx-size ante processing — a real
// case measured ~470_000 gas used against a 400_000 budget.
export const defaultFee: StdFee = makeFee({ gas: 800_000 });

export type Clock = () => Date;

export type UnsignedUpgradeArtifact = {
  kind: typeof unsignedUpgradeKind;
  contract: ContractName;
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

export type NetworkConfigShape = {
  chainName: string;
  rpcAddrs: string[];
};

type AccountQueryClient = {
  getAccount(address: string): Promise<{
    accountNumber: number;
    sequence: number;
    pubkey: Pubkey | null;
  } | null>;
};

/**
 * Resolve a raw `grantee` CLI/workflow input into an address, a real public
 * key (in the same `Any`-shaped form `parseJsonPublicKey` and
 * `makeAuthInfoBytes` expect), and its current account number/sequence —
 * with a single on-chain lookup either way.
 *
 * `input` is either:
 * - a bech32 address: the public key is looked up on chain. Fails if the
 *   account has never sent a transaction (so the chain has no record of
 *   its public key) — pass the pubkey directly in that case.
 * - a public key, in the same `@type`-tagged JSON shape `agd keys show
 *   <name> --pubkey` prints: the address is derived locally. The account
 *   must still exist on chain (e.g. already funded) to have a known
 *   account number, regardless of whether it has ever signed anything.
 *
 * The grantee's real public key must be embedded in the unsigned tx's
 * placeholder `signer_info`, or `agd tx multisign` panics with a nil
 * pointer dereference (it unconditionally reads
 * `signer_infos[0].public_key` while verifying the supplied signatures).
 */
/**
 * Derive a grantee's address from raw CLI/workflow input without touching
 * the network: `input` is either a bech32 address (returned as-is) or a
 * public key JSON (address derived locally). Shared with rerun guards that
 * need to check "does this run's grantee match an already-generated
 * artifact's" without an extra chain round-trip.
 */
export const resolveGranteeAddress = (input: string): string => {
  const asJson = (() => {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  })();
  if (!asJson) return input;
  const pubkey = parseJsonPublicKey(asJson) || Fail`invalid grantee pubkey`;
  return pubkeyToAddress(decodePubkey(pubkey), 'agoric');
};

const resolveGrantee = async (
  input: string,
  queryClient: AccountQueryClient,
): Promise<{
  address: string;
  pubkey: { typeUrl: string; value: Uint8Array };
  accountNumber: number;
  sequence: number;
}> => {
  const asJson = (() => {
    try {
      const parsed = JSON.parse(input);
      return parsed && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  })();

  if (asJson) {
    const pubkey = parseJsonPublicKey(asJson) || Fail`invalid grantee pubkey`;
    const address = resolveGranteeAddress(input);
    const { accountNumber, sequence } =
      (await queryClient.getAccount(address)) ||
      Fail`grantee ${address} (derived from the given public key) was not found on chain; fund it before generating this request`;
    return { address, pubkey, accountNumber, sequence };
  }

  const account =
    (await queryClient.getAccount(input)) ||
    Fail`grantee ${input} not found on chain`;
  const pubkey =
    account.pubkey ||
    Fail`grantee ${input} has no public key on chain (never sent a transaction?); pass its public key directly instead (e.g. \`agd keys show <name> --pubkey\`)`;
  const any = encodePubkey(pubkey);
  return {
    address: input,
    pubkey: { typeUrl: any.typeUrl, value: any.value },
    accountNumber: account.accountNumber,
    sequence: account.sequence,
  };
};

export type DetachedSignatureDescriptor = {
  signatures: ReadonlyArray<{
    public_key: unknown;
    data: { single: { mode: string; signature: string } };
  }>;
};

export type CombineSignaturesResult =
  | {
      ready: true;
      signedTx: { body: unknown; auth_info: unknown; signatures: string[] };
      signedAddresses: string[];
    }
  | { ready: false; reason: string };

/**
 * Compute the amino sign-bytes digest for a tx (`msgs`/`fee`/`chainId`/
 * `memo`/`accountNumber`/`sequence`) once, shared across every signer's
 * verification below. cosmjs offers no ready-made helper for this —
 * `makeMultisignedTx` (below) blindly trusts whatever signature bytes it's
 * handed, so a corrupted or mismatched signature file would otherwise go
 * unnoticed until the chain rejects the broadcast.
 */
const makeAminoSignDocDigest = ({
  msgs,
  fee,
  chainId,
  memo,
  accountNumber,
  sequence,
}: {
  msgs: Array<{ type: string; value: unknown }>;
  fee: StdFee;
  chainId: string;
  memo: string;
  accountNumber: number;
  sequence: number;
}) => {
  const signDoc = makeAminoSignDoc(
    msgs,
    fee,
    chainId,
    memo,
    accountNumber,
    sequence,
  );
  return sha256(serializeSignDoc(signDoc));
};

/**
 * Verify each detached-grantee signature descriptor (the gRPC-gateway JSON
 * `agd tx sign --multisig=... --sign-mode=amino-json` produces) against the
 * unsigned tx it's supposed to cover, and — once enough valid signatures
 * from distinct multisig members are collected — combine them into the
 * final signed tx, in the same gRPC-gateway JSON shape `makeAgdUnsignedTx`
 * uses.
 *
 * Throws if any signature fails to verify or comes from an address that
 * isn't a member of the grantee's multisig: those indicate a corrupted or
 * mismatched signature file, not merely "not ready yet". Returns
 * `{ready: false}` only for the benign, expected "still waiting on
 * cosigners" case.
 *
 * `getAccountNumber` is called (only once we know there's a multisig grantee
 * worth combining for) with the grantee's address, derived here from its
 * public key already embedded in the unsigned tx — the caller doesn't need
 * to resolve or pass it in independently.
 */
export const combineDetachedGranteeSignatures = async ({
  unsignedTx,
  chainId,
  getAccountNumber,
  signatureDescriptors,
}: {
  unsignedTx: {
    body: { memo?: string; messages: unknown[] };
    auth_info: {
      signer_infos: Array<{ public_key?: unknown; sequence: string }>;
      fee?: { amount: { denom: string; amount: string }[]; gas_limit: string };
    };
  };
  chainId: string;
  getAccountNumber: (granteeAddress: string) => Promise<number>;
  signatureDescriptors: readonly DetachedSignatureDescriptor[];
}): Promise<CombineSignaturesResult> => {
  const granteePubkeyJson = unsignedTx.auth_info.signer_infos[0]?.public_key;
  const granteePubkeyAny = granteePubkeyJson
    ? parseJsonPublicKey(granteePubkeyJson)
    : undefined;
  if (
    !granteePubkeyAny ||
    granteePubkeyAny.typeUrl !== LegacyAminoPubKey.typeUrl
  ) {
    return {
      ready: false,
      reason: 'grantee is not a multisig; upload the signed tx directly',
    };
  }
  const multisigPubkey = decodePubkey(
    granteePubkeyAny,
  ) as MultisigThresholdPubkey;
  const threshold = Number(multisigPubkey.value.threshold);
  const memberAddresses = new Set(
    multisigPubkey.value.pubkeys.map(pk => pubkeyToAddress(pk, 'agoric')),
  );
  const granteeAddress = pubkeyToAddress(multisigPubkey, 'agoric');
  const accountNumber = await getAccountNumber(granteeAddress);

  const sequence = Number(unsignedTx.auth_info.signer_infos[0]!.sequence || 0);
  const unsignedFee =
    unsignedTx.auth_info.fee || Fail`unsigned tx is missing auth_info.fee`;
  const fee: StdFee = {
    amount: unsignedFee.amount,
    gas: unsignedFee.gas_limit,
  };
  const memo = unsignedTx.body.memo || '';
  const msgs = unsignedTx.body.messages.map(message => toAminoMsg(message));
  const digest = makeAminoSignDocDigest({
    msgs,
    fee,
    chainId,
    memo,
    accountNumber,
    sequence,
  });

  const verified = new Map<string, Uint8Array>();
  for (const descriptor of signatureDescriptors) {
    for (const sig of descriptor.signatures) {
      const pubkeyAny =
        parseJsonPublicKey(sig.public_key) ||
        Fail`unparseable signature public_key`;
      pubkeyAny.typeUrl === Secp256k1PubKeyProto.typeUrl ||
        Fail`unsupported signature public_key type ${pubkeyAny.typeUrl}`;
      const pubkeyBytes = Secp256k1PubKeyProto.decode(pubkeyAny.value).key;
      const address = pubkeyToAddress(decodePubkey(pubkeyAny), 'agoric');
      memberAddresses.has(address) ||
        Fail`signature from ${address} is not a member of the grantee multisig`;
      const signatureBytes = Buffer.from(sig.data.single.signature, 'base64');
      const signature = Secp256k1Signature.fromFixedLength(signatureBytes);
      const ok = await Secp256k1.verifySignature(
        signature,
        digest,
        pubkeyBytes,
      );
      ok ||
        Fail`signature from ${address} does not verify against the unsigned tx`;
      verified.set(address, signatureBytes);
    }
  }

  if (verified.size < threshold) {
    return {
      ready: false,
      reason: `${verified.size} of ${threshold} required signatures collected`,
    };
  }

  const bodyBytes = encodeTxBodyBytes(unsignedTx.body);
  const signedTxRaw = makeMultisignedTx(
    multisigPubkey,
    sequence,
    fee,
    bodyBytes,
    verified,
  );
  const signedTx = makeAgdSignedTx({
    bodyBytes: signedTxRaw.bodyBytes,
    authInfoBytes: signedTxRaw.authInfoBytes,
    signatures: signedTxRaw.signatures,
  });
  return { ready: true, signedTx, signedAddresses: [...verified.keys()] };
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

export const formatJson = (specimen: unknown) =>
  `${JSON.stringify(specimen, null, 2)}\n`;

const makeUnsignedUpgradeArtifact = ({
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
  contract: ContractName;
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
    ...(grantee ? { grantee } : {}),
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

export const makeUpgradeRequestBuilder = ({
  contract,
  networkConfig,
  grantee: granteeInput,
  queryClient,
  walletKit,
  clock,
}: {
  contract: ContractName;
  networkConfig: NetworkConfigShape;
  /**
   * Either the grantee's bech32 address (its public key is then looked up
   * on chain) or its public key in the same `@type`-tagged JSON shape `agd
   * keys show <name> --pubkey` prints (its address is then derived
   * locally). See {@link resolveGrantee}.
   */
  grantee?: string;
  queryClient: AccountQueryClient;
  walletKit: WalletKitShape;
  clock: Clock;
}) =>
  harden({
    async generateUpgradeRequest({
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
      const controlAddress = CONTROL_ADDRESSES[contract][net];
      const { postalService } = walletKit.agoricNames.instance;
      postalService || Fail`missing postalService instance in agoricNames`;
      const privateArgsOverrides = harden({
        ...overrides,
        postalServiceInstance: postalService,
      });
      const grantee = granteeInput
        ? await resolveGrantee(granteeInput, queryClient)
        : undefined;
      const signerAddress = grantee?.address || controlAddress;
      const txMsg = grantee
        ? makeUpgradeExecEncodeObject(
            {
              bundleId,
              privateArgsOverrides,
            },
            {
              marshaller: walletKit.marshaller,
              controlAddress,
              grantee: grantee.address,
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
        grantee ||
        (await queryClient.getAccount(signerAddress)) ||
        Fail`signer account ${signerAddress} not found on chain`;
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
        [{ pubkey: grantee?.pubkey as never, sequence }],
        defaultFee.amount,
        Number(defaultFee.gas),
        undefined,
        undefined,
      );
      return makeUnsignedUpgradeArtifact({
        contract,
        controlAddress,
        ...(grantee ? { grantee: grantee.address } : {}),
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
