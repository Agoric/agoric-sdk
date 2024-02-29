//@ts-nocheck
import { GeneratedType, Registry, OfflineSigner } from '@cosmjs/proto-signing';
import {
  defaultRegistryTypes,
  AminoTypes,
  SigningStargateClient,
} from '@cosmjs/stargate';
import { HttpEndpoint } from '@cosmjs/tendermint-rpc';
import * as agoricSwingsetMsgsRegistry from './swingset/msgs.registry.js';
import * as agoricVibcMsgsRegistry from './vibc/msgs.registry.js';
import * as agoricSwingsetMsgsAmino from './swingset/msgs.amino.js';
import * as agoricVibcMsgsAmino from './vibc/msgs.amino.js';
export const agoricAminoConverters = {
  ...agoricSwingsetMsgsAmino.AminoConverter,
  ...agoricVibcMsgsAmino.AminoConverter,
};
export const agoricProtoRegistry: ReadonlyArray<[string, GeneratedType]> = [
  ...agoricSwingsetMsgsRegistry.registry,
  ...agoricVibcMsgsRegistry.registry,
];
export const getSigningAgoricClientOptions = ({
  defaultTypes = defaultRegistryTypes,
}: {
  defaultTypes?: ReadonlyArray<[string, GeneratedType]>;
} = {}): {
  registry: Registry;
  aminoTypes: AminoTypes;
} => {
  const registry = new Registry([...defaultTypes, ...agoricProtoRegistry]);
  const aminoTypes = new AminoTypes({
    ...agoricAminoConverters,
  });
  return {
    registry,
    aminoTypes,
  };
};
export const getSigningAgoricClient = async ({
  rpcEndpoint,
  signer,
  defaultTypes = defaultRegistryTypes,
}: {
  rpcEndpoint: string | HttpEndpoint;
  signer: OfflineSigner;
  defaultTypes?: ReadonlyArray<[string, GeneratedType]>;
}) => {
  const { registry, aminoTypes } = getSigningAgoricClientOptions({
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
