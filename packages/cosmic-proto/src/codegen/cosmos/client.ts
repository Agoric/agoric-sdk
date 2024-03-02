//@ts-nocheck
import { GeneratedType, Registry, OfflineSigner } from '@cosmjs/proto-signing';
import { AminoTypes, SigningStargateClient } from '@cosmjs/stargate';
import { HttpEndpoint } from '@cosmjs/tendermint-rpc';
import * as cosmosAuthzV1beta1TxRegistry from './authz/v1beta1/tx.registry.js';
import * as cosmosBankV1beta1TxRegistry from './bank/v1beta1/tx.registry.js';
import * as cosmosStakingV1beta1TxRegistry from './staking/v1beta1/tx.registry.js';
import * as cosmosAuthzV1beta1TxAmino from './authz/v1beta1/tx.amino.js';
import * as cosmosBankV1beta1TxAmino from './bank/v1beta1/tx.amino.js';
import * as cosmosStakingV1beta1TxAmino from './staking/v1beta1/tx.amino.js';
export const cosmosAminoConverters = {
  ...cosmosAuthzV1beta1TxAmino.AminoConverter,
  ...cosmosBankV1beta1TxAmino.AminoConverter,
  ...cosmosStakingV1beta1TxAmino.AminoConverter,
};
export const cosmosProtoRegistry: ReadonlyArray<[string, GeneratedType]> = [
  ...cosmosAuthzV1beta1TxRegistry.registry,
  ...cosmosBankV1beta1TxRegistry.registry,
  ...cosmosStakingV1beta1TxRegistry.registry,
];
export const getSigningCosmosClientOptions = (): {
  registry: Registry;
  aminoTypes: AminoTypes;
} => {
  const registry = new Registry([...cosmosProtoRegistry]);
  const aminoTypes = new AminoTypes({
    ...cosmosAminoConverters,
  });
  return {
    registry,
    aminoTypes,
  };
};
export const getSigningCosmosClient = async ({
  rpcEndpoint,
  signer,
}: {
  rpcEndpoint: string | HttpEndpoint;
  signer: OfflineSigner;
}) => {
  const { registry, aminoTypes } = getSigningCosmosClientOptions();
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
