//@ts-nocheck
import { GeneratedType, Registry, OfflineSigner } from '@cosmjs/proto-signing';
import {
  defaultRegistryTypes,
  AminoTypes,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { HttpEndpoint } from '@cosmjs/tendermint-rpc';
import * as ibcApplicationsInterchainAccountsControllerV1TxRegistry from './applications/interchain_accounts/controller/v1/tx.registry.js';
import * as ibcApplicationsTransferV1TxRegistry from './applications/transfer/v1/tx.registry.js';
import * as ibcApplicationsInterchainAccountsControllerV1TxAmino from './applications/interchain_accounts/controller/v1/tx.amino.js';
import * as ibcApplicationsTransferV1TxAmino from './applications/transfer/v1/tx.amino.js';
export const ibcAminoConverters = {
  ...ibcApplicationsInterchainAccountsControllerV1TxAmino.AminoConverter,
  ...ibcApplicationsTransferV1TxAmino.AminoConverter,
};
export const ibcProtoRegistry: ReadonlyArray<[string, GeneratedType]> = [
  ...ibcApplicationsInterchainAccountsControllerV1TxRegistry.registry,
  ...ibcApplicationsTransferV1TxRegistry.registry,
];
export const getSigningIbcClientOptions = ({
  defaultTypes = defaultRegistryTypes,
}: {
  defaultTypes?: ReadonlyArray<[string, GeneratedType]>;
} = {}): {
  registry: Registry;
  aminoTypes: AminoTypes;
} => {
  const registry = new Registry([...defaultTypes, ...ibcProtoRegistry]);
  const aminoTypes = new AminoTypes({
    ...ibcAminoConverters,
  });
  return {
    registry,
    aminoTypes,
  };
};
export const getSigningIbcClient = async ({
  rpcEndpoint,
  signer,
  defaultTypes = defaultRegistryTypes,
}: {
  rpcEndpoint: string | HttpEndpoint;
  signer: OfflineSigner;
  defaultTypes?: ReadonlyArray<[string, GeneratedType]>;
}) => {
  const { registry, aminoTypes } = getSigningIbcClientOptions({
    defaultTypes,
  });
  const client = await SigningStargateClient.connectWithSigner(
    rpcEndpoint,
    signer,
    {
      registry: registry as any,
      aminoTypes,
    },
  );
  return client;
};
