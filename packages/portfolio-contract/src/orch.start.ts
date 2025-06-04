import type { ManifestBundleRef } from '@agoric/deploy-script-support/src/externalTypes.js';
import type { Brand, Issuer } from '@agoric/ertp';
import {
  deeplyFulfilledObject,
  makeTracer,
  type TypedPattern,
} from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type { OrchestrationPowers } from '@agoric/orchestration';
import type { Board, NameHub } from '@agoric/vats';
import type {
  BootstrapManifest,
  BootstrapManifestPermit,
} from '@agoric/vats/src/core/lib-boot.js';
import type { ContractMeta, Installation, Instance } from '@agoric/zoe';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils.js';
import { E, type ERef } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { fromExternalConfig, type LegibleCapData } from './config-marshal.js';

const { fromEntries, keys } = Object;

const trace = makeTracer(`ORCH-Start`, true);

/** generic permit constraints */
export type PermitG = BootstrapManifest & { issuer: BootstrapManifest } & {
  brand: BootstrapManifest;
};

export type ContractMetaG<
  CN extends string,
  CFG extends CopyRecord,
> = ContractMeta & { name: CN } & {
  deployConfigShape?: TypedPattern<CFG>;
};

type MakePrivateArgs<
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
> = (op: OrchestrationPowers, m: Marshaller, cfg: CFG) => Parameters<SF>[1];

type UpgradeKit<SF extends ContractStartFunction> = StartedInstanceKit<SF> & {
  label: string;
  privateArgs: Parameters<SF>[1];
};

/** null chainStorage case is vestigial */
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

/**
 * XXX Shouldn't the bridge or board vat handle this?
 */
const makePublishingStorageKit = async (
  path: string,
  {
    chainStorage,
    board,
  }: {
    chainStorage: ERef<StorageNode>;
    board: ERef<Board>;
  },
) => {
  const storageNode = await E(chainStorage).makeChildNode(path);

  const marshaller = await E(board).getPublishingMarshaller();
  return { storageNode, marshaller };
};

export const permittedIssuers = async <P extends PermitG>(
  agoricNames: BootstrapPowers['consume']['agoricNames'],
  permitG: P,
) => {
  const permittedKeys = keys(permitG?.issuer?.consume || {});
  const agoricIssuers = await E(E(agoricNames).lookup('issuer')).entries();
  const issuerKeywordRecord = fromEntries(
    agoricIssuers.filter(([n, _v]) => permittedKeys.includes(n)),
  ) as Record<keyof P['issuer']['produce'], Issuer>;
  return issuerKeywordRecord;
};

export const startOrchContract = async <
  CN extends string,
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
  P extends PermitG,
>(
  metaG: ContractMetaG<CN, CFG>,
  permitG: P,
  makePrivateArgs: MakePrivateArgs<SF, CFG>,
  {
    produce,
    consume,
    installation: {
      consume: { [metaG.name]: installation },
    },
    instance: {
      produce: { [metaG.name]: produceInstance },
    },
  }: CorePowersG<CN, SF, P> & BootstrapPowers & ChainStoragePowers,
  configStruct: { options: LegibleCapData<CFG> },
) => {
  trace('startOrchContract');

  const { agoricNames } = consume;
  const issuerKeywordRecord = await permittedIssuers(agoricNames, permitG);

  const brandHub: Promise<NameHub> = E(agoricNames).lookup('brand');
  const xVatEntries = await E(brandHub).entries();
  const config = fromExternalConfig(
    configStruct.options,
    fromEntries(xVatEntries),
    metaG.deployConfigShape,
  );
  const { terms } = config;
  trace('using terms', terms);

  const { chainStorage, board } = consume;
  const { storageNode, marshaller } = await makePublishingStorageKit(
    metaG.name,
    { board, chainStorage },
  );

  const {
    chainTimerService: timerService,
    localchain,
    cosmosInterchainService,
  } = consume;
  const orchestrationPowers = await deeplyFulfilledObject(
    harden({
      localchain,
      orchestrationService: cosmosInterchainService,
      storageNode,
      timerService,
      agoricNames,
    }),
  );
  const privateArgs = await makePrivateArgs(
    orchestrationPowers,
    marshaller,
    config,
  );

  const { startUpgradable } = consume;
  const kit = await E(startUpgradable)({
    label: metaG.name,
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
  });
  const { instance } = kit;
  const fullKit = harden({ ...kit, privateArgs }) as UpgradeKit<SF>;
  // @ts-expect-error XXX tsc gets confused?
  produce[`${metaG.name}Kit`].resolve(fullKit);

  produceInstance.reset();
  produceInstance.resolve(instance);

  trace('startOrchContract done', instance);
  return { config, kit: fullKit };
};
harden(startOrchContract);

export const makeGetManifest = <CFG extends CopyRecord, P extends PermitG>(
  startFn: { name: string },
  permit: P,
  contractName: string,
) => {
  const getManifestForFastOrch = (
    {
      restoreRef,
    }: {
      restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation<any>>;
    },
    {
      installKeys,
      options,
    }: {
      installKeys: { fastUsdc: ERef<ManifestBundleRef> };
      options: LegibleCapData<CFG>;
    },
  ) => {
    return {
      manifest: { [startFn.name]: permit } satisfies BootstrapManifest,
      installations: { [contractName]: restoreRef(installKeys[contractName]) },
      options,
    };
  };
  harden(getManifestForFastOrch);

  return getManifestForFastOrch;
};

export const orchPermit = {
  localchain: true,
  cosmosInterchainService: true,
  chainStorage: true,
  chainTimerService: true,
  agoricNames: true,

  // for publishing Brands and other remote object references
  board: true,

  // limited distribution during MN2: contract installation
  startUpgradable: true,
  zoe: true, // only getTerms() is needed. XXX should be split?
} as const satisfies BootstrapManifestPermit;
harden(orchPermit);
