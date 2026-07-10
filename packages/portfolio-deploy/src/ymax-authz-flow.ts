/** @file build unsigned ymax upgrade requests for release workflows */
/* eslint-disable @jessie.js/safe-await-separator */
import {
  CONTROL_ADDRESSES,
  PORTFOLIO_CONTRACT_NAMES,
} from '@agoric/portfolio-api/src/portfolio-constants.js';
import { pubkeyToAddress, type Pubkey } from '@cosmjs/amino';
import {
  decodePubkey,
  encodePubkey,
  makeAuthInfoBytes,
  makeSignBytes,
  makeSignDoc,
} from '@cosmjs/proto-signing';
import { type SignerData, type StdFee } from '@cosmjs/stargate';
import { Fail } from '@endo/errors';
import { createHash } from 'node:crypto';
import { netOfConfig } from './ymax-admin-helpers.ts';
import {
  makeUpgradeEncodeObject,
  makeUpgradeExecEncodeObject,
  parseJsonPublicKey,
  registry,
} from './ymax-authz-msgs.ts';

export type ContractName = (typeof PORTFOLIO_CONTRACT_NAMES)[number];
const unsignedUpgradeKind = 'ymax-authz-upgrade-request' as const;

export const defaultFee: StdFee = {
  gas: '400000',
  amount: [{ denom: 'ubld', amount: '10000' }],
};

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
    const address = pubkeyToAddress(decodePubkey(pubkey), 'agoric');
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
