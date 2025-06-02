import type { ManifestBundleRef } from '@agoric/deploy-script-support/src/externalTypes.js';
import {
  deeplyFulfilledObject,
  makeTracer,
  type TypedPattern,
} from '@agoric/internal';
import type { OrchestrationPowers } from '@agoric/orchestration';
import type { Board, NameHub } from '@agoric/vats';
import type {
  BootstrapManifest,
  BootstrapManifestPermit,
} from '@agoric/vats/src/core/lib-boot.js';
import type { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils.js';
import { E } from '@endo/far';
import type { CopyRecord } from '@endo/pass-style';
import { fromExternalConfig, type LegibleCapData } from './config-marshal.js';

const { fromEntries } = Object;

const trace = makeTracer(`ORCH-Start`, true);

/** generic permit constraints */
export type PermitG = BootstrapManifest & { issuer: BootstrapManifest } & {
  brand: BootstrapManifest;
};

export type ContractMetaG<
  CN extends string,
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
> = ContractMeta & { name: CN } & {
  adminRoles?: Record<keyof CFG, keyof StartedInstanceKit<SF>['creatorFacet']>;
  deployConfigShape?: TypedPattern<CFG>;
};

type UpgradeKit<SF extends ContractStartFunction> = StartedInstanceKit<SF> & {
  label: string;
  privateArgs: Parameters<SF>[1];
};

type MakePrivateArgs<
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
> = (op: OrchestrationPowers, m: Marshaller, cfg: CFG) => Parameters<SF>[1];

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

/** null chainStorage case is vestigial */
export type ChainStoragePowers = {
  consume: { chainStorage: Promise<StorageNode> };
};

/**
 * @throws if admin role smart wallets are not yet provisioned
 */
export const startOrchContract = async <
  CN extends string,
  SF extends ContractStartFunction,
  CFG extends CopyRecord,
  P extends PermitG,
>(
  metaG: ContractMetaG<CN, SF, CFG>,
  permitG: P,
  makePrivateArgs: MakePrivateArgs<SF, CFG>,
  {
    produce,
    consume,
    issuer: { produce: produceIssuer },
    brand: { produce: produceBrand },
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
  // TODO:  const issuerKeywordRecord = await permittedIssuers(agoricNames, permitG);

  const brandHub: Promise<NameHub> = E(agoricNames).lookup('brand');
  const xVatEntries = await E(brandHub).entries();
  const config = fromExternalConfig(
    configStruct.options,
    fromEntries(xVatEntries),
    metaG.deployConfigShape,
  );
  const { terms } = config;
  trace('using terms', terms);

  // TODO: adminRoles
  //   const adminRoles = objectMap(metaG?.adminRoles || {}, (_method, role) => {
  //     const nameToAddress = config[role];
  //     mustMatch(nameToAddress, M.recordOf(M.string(), M.string()));
  //     return makeAdminRole(
  //       /** @type {string} */ role, // XXX tsc gets confused?
  //       consume.namesByAddress,
  //       nameToAddress,
  //     );
  //   });
  //
  //   await Promise.all(values(adminRoles).map(r => r.lookup()));

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

  const { startUpgradable, zoe } = consume;
  const issuerKeywordRecord = {}; // TODO
  const kit = await E(startUpgradable)({
    label: metaG.name,
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
  });
  const { instance, creatorFacet } = kit;
  /** @type {UpgradeKit<SF>} */
  const fullKit = harden({ ...kit, privateArgs });
  // @ts-expect-error XXX tsc gets confused?
  produce[`${metaG.name}Kit`].resolve(fullKit);

  // TODO: issuers
  //   const newIssuerNames = keys(permitG?.issuer?.produce || {}).filter(
  //     n => permitG?.brand?.produce?.[n],
  //   );
  //   if (newIssuerNames.length > 0) {
  //     const nameToKeyword = permitG.issuer.produce;
  //     const { issuers, brands } = await E(zoe).getTerms(instance);
  //     for (const name of newIssuerNames) {
  //       const keyword = nameToKeyword[name];
  //       keyword in issuers ||
  //         Fail`${name} not in contract issuers: ${keys(issuers)}`;
  //       console.log('new well-known Issuer, Brand:', name, 'from', keyword);
  //       produceIssuer[name].reset();
  //       produceIssuer[name].resolve(issuers[keyword]);
  //       produceBrand[name].reset();
  //       produceBrand[name].resolve(brands[keyword]);
  //       await publishDisplayInfo(brands[keyword], { board, chainStorage });
  //     }
  //   }

  // TODO: adminRoles
  //   for (const [role, method] of entries(metaG.adminRoles || {})) {
  //     await adminRoles[role].send(addr => E(creatorFacet)[method](addr));
  //   }

  produceInstance.reset();
  produceInstance.resolve(instance);

  trace('startOrchContract done', instance);
  return { config, kit: fullKit };
};
harden(startOrchContract);

export const makeGetManifest = <CFG extends CopyRecord, P extends PermitG>(
  startFn: Function,
  permit: P,
  contractName: string,
) => {
  const getManifestForFastOrch = (
    {
      restoreRef,
    }: { restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation> },
    {
      installKeys,
      options,
    }: {
      installKeys: { fastUsdc: ERef<ManifestBundleRef> };
      options: LegibleCapData<CFG>;
    },
  ) => {
    return {
      /** @satisfies {BootstrapManifest} */
      manifest: { [startFn.name]: permit },
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
