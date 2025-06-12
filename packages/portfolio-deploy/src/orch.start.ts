import type { ManifestBundleRef } from '@agoric/deploy-script-support/src/externalTypes.js';
import type { Brand, Issuer } from '@agoric/ertp';
import {
  deeplyFulfilledObject,
  makeTracer,
  objectMap,
  type Remote,
  type TypedPattern,
} from '@agoric/internal';
import type {
  Marshaller,
  StorageNode,
} from '@agoric/internal/src/lib-chainStorage.js';
import type {
  ChainInfo,
  IBCConnectionInfo,
  OrchestrationPowers,
} from '@agoric/orchestration';
import { makeAssetInfo } from '@agoric/orchestration/src/chain-name-service.js';
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

const { entries, fromEntries, keys } = Object;

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

  const { agoricNames, zoe } = consume;
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

  trace(
    '@@@',
    metaG.name,
    await E(zoe).getBundleIDFromInstallation(await installation),
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
  trace('started terms', await E(zoe).getTerms(instance));
  const fullKit = harden({ ...kit, privateArgs }) as UpgradeKit<SF>;
  // @ts-expect-error XXX tsc gets confused?
  produce[`${metaG.name}Kit`].resolve(fullKit);

  produceInstance.reset();
  produceInstance.resolve(instance);

  trace('startOrchContract done', instance);
  return { config, kit: fullKit };
};
harden(startOrchContract);

const DBG = (label, x) => {
  console.log(label, x);
  return x;
};

export const makeGetManifest = <
  CFG extends CopyRecord,
  P extends PermitG,
  CN extends string,
>(
  startFn: { name: string },
  permit: P,
  contractName: CN,
) => {
  const getManifestForOrch = (
    {
      restoreRef,
    }: {
      restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation<any>>;
    },
    {
      installKeys,
      options,
    }: {
      installKeys: Record<CN, ERef<ManifestBundleRef>>;
      options: LegibleCapData<CFG>;
    },
  ) => {
    DBG('@@@installKeys', installKeys);
    return DBG('@@@getManifestForOrch returns', {
      manifest: { [startFn.name]: permit } satisfies BootstrapManifest,
      installations: { [contractName]: restoreRef(installKeys[contractName]) },
      options,
    });
  };
  harden(getManifestForOrch);

  return getManifestForOrch;
};

// XXX copied from chain-hub.js
/**
 * Utility to reverse connection info perspective.
 */
const reverseConnInfo = (connInfo: IBCConnectionInfo): IBCConnectionInfo => {
  const { transferChannel } = connInfo;
  return harden({
    id: connInfo.counterparty.connection_id,
    client_id: connInfo.counterparty.client_id,
    counterparty: {
      client_id: connInfo.client_id,
      connection_id: connInfo.id,
    },
    state: connInfo.state,
    transferChannel: {
      ...transferChannel,
      channelId: transferChannel.counterPartyChannelId,
      counterPartyChannelId: transferChannel.channelId,
      portId: transferChannel.counterPartyPortId,
      counterPartyPortId: transferChannel.portId,
    },
  });
};

export const mixConnections = (
  plainInfo: Record<string, ChainInfo>,
  connInfos: Record<string, IBCConnectionInfo>,
) => {
  const chainInfos = { ...plainInfo };
  for (const [connKey, directed] of entries(connInfos)) {
    const [p, c] = connKey.split('_'); // XXX named function to do this?
    const [pn, cn] = [p, c].map(cid =>
      keys(chainInfos).find(
        k =>
          chainInfos[k].namespace === 'cosmos' && chainInfos[k].chainId === cid,
      ),
    );
    if (!(pn && cn)) {
      trace(
        'cannot find chains for connection',
        connKey,
        objectMap(chainInfos, info => 'chainId' in info && info.chainId),
      );
      continue;
    }
    for (const { name, id, connInfo } of [
      { name: pn, id: c, connInfo: directed },
      { name: cn, id: p, connInfo: reverseConnInfo(directed) },
    ]) {
      const cInfo = chainInfos[name];
      if (cInfo.namespace !== 'cosmos') {
        trace(connKey, 'connects non-cosmos chain', name, cInfo);
        continue;
      }
      chainInfos[name] = {
        ...cInfo,
        connections: { ...cInfo.connections, [id]: connInfo },
      };
    }
  }
  return harden(chainInfos);
};

export const lookupInterchainInfo = async (
  agoricNames: Remote<NameHub>,
  tokenMap = { agoric: ['ubld'], noble: ['uusdc'] },
) => {
  const plainInfos = fromEntries(
    await E(E(agoricNames).lookup('chain')).entries(),
  ) as Record<string, ChainInfo>;
  const connInfos = fromEntries(
    await E(E(agoricNames).lookup('chainConnection')).entries(),
  ) as Record<string, IBCConnectionInfo>;

  const chainInfos = mixConnections(plainInfos, connInfos);

  return harden({
    chainInfo: chainInfos,
    assetInfo: makeAssetInfo(chainInfos, tokenMap),
  });
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
