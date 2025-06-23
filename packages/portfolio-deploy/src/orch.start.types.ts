import type { Remote } from '@agoric/internal';
import type { OrchestrationPowers } from '@agoric/orchestration';
import type { BootstrapManifest } from '@agoric/vats/src/core/lib-boot.js';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils';
import type { CopyRecord } from '@endo/pass-style';

/** generic permit constraints */
export type PermitG = BootstrapManifest & { issuer: BootstrapManifest } & {
  brand: BootstrapManifest;
};

export type OrchestrationPowersWithStorage = OrchestrationPowers & {
  storageNode: Remote<StorageNode>;
};

export type MakePrivateArgs<
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
> = (
  op: OrchestrationPowersWithStorage,
  m: Marshaller,
  cfg: CFG,
) => Parameters<SF>[1];

export type UpgradeKit<SF extends ContractStartFunction> =
  StartedInstanceKit<SF> & {
    label: string;
    privateArgs: Parameters<SF>[1];
  };

export type ChainStoragePowers = {
  consume: { chainStorage: Promise<StorageNode> };
};

export type CorePowersG<
  CN extends string,
  SF extends ContractStartFunction,
  P extends PermitG,
> = PromiseSpaceOf<Record<`${CN}Kit`, UpgradeKit<SF>>> & {
  installation: PromiseSpaceOf<Record<CN, Installation<SF>>>;
  instance: PromiseSpaceOf<Record<CN, Instance<SF>>>;
  issuer: PromiseSpaceOf<Record<keyof P['issuer']['produce'], Issuer>>;
  brand: PromiseSpaceOf<Record<keyof P['brand']['produce'], Brand>>;
} & ChainStoragePowers;
