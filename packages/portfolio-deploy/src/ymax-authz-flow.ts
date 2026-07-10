/** @file build unsigned ymax upgrade requests for release workflows */
/* eslint-disable @jessie.js/safe-await-separator */
import { CONTROL_ADDRESSES } from '@agoric/portfolio-api/src/portfolio-constants.js';
import {
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
  registry,
} from './ymax-authz-msgs.ts';

const defaultContract = 'ymax0';
const unsignedUpgradeKind = 'ymax-authz-upgrade-request' as const;

export const defaultFee: StdFee = {
  gas: '400000',
  amount: [{ denom: 'ubld', amount: '10000' }],
};

export type Clock = () => Date;

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

export type NetworkConfigShape = {
  chainName: string;
  rpcAddrs: string[];
};

type SequenceQueryClient = {
  getSequence(address: string): Promise<{
    accountNumber: number;
    sequence: number;
  }>;
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
    contract: defaultContract,
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
  networkConfig,
  grantee,
  queryClient,
  walletKit,
  clock,
}: {
  networkConfig: NetworkConfigShape;
  grantee?: string;
  queryClient: SequenceQueryClient;
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
