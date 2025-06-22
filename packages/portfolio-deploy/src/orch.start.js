import { deeplyFulfilledObject, makeTracer, objectMap } from '@agoric/internal';
import { E, passStyleOf } from '@endo/far';
import { makeAssetInfo } from './chain-name-service.js';
import { fromExternalConfig } from './config-marshal.js';
/**
 * @import { Issuer } from '@agoric/ertp';
 * @import { ManifestBundleRef } from '@agoric/deploy-script-support/src/externalTypes.js';
 * @import { Remote } from '@agoric/internal';
 * @import { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
 * @import { ChainInfo, IBCConnectionInfo } from '@agoric/orchestration';
 * @import { Board, NameHub } from '@agoric/vats';
 * @import { BootstrapManifest, BootstrapManifestPermit } from '@agoric/vats/src/core/lib-boot.js';
 * @import { Installation } from '@agoric/zoe';
 * @import { ContractStartFunction } from '@agoric/zoe/src/zoeService/utils.js';
 * @import { ERef } from '@endo/far';
 * @import { CopyRecord } from '@endo/pass-style';
 * @import { LegibleCapData } from './config-marshal.js';
 * @import { PermitG, CorePowersG, ChainStoragePowers, MakePrivateArgs, UpgradeKit } from './orch.start.types.ts';
 */

const { entries, fromEntries, keys } = Object;

const trace = makeTracer(`ORCH-Start`, true);

/**
 * XXX Shouldn't the bridge or board vat handle this?
 *
 * @param {string} path
 * @param {{
 *   chainStorage: ERef<StorageNode>;
 *   board: ERef<Board>;
 * }} powers
 */
const makePublishingStorageKit = async (path, { chainStorage, board }) => {
  const storageNode = await E(chainStorage).makeChildNode(path);

  const marshaller = await E(board).getPublishingMarshaller();
  return { storageNode, marshaller };
};

/**
 * @template {PermitG} P
 * @param {BootstrapPowers['consume']['agoricNames']} agoricNames
 * @param {P} permitG
 * @returns {Promise<Record<keyof P['issuer']['consume'], Issuer>>}
 */
export const permittedIssuers = async (agoricNames, permitG) => {
  const permittedKeys = keys(permitG?.issuer?.consume || {});
  await null;
  const agoricIssuers = fromEntries(
    await E(E(agoricNames).lookup('issuer')).entries(),
  );
  const issuerKeywordRecord = fromEntries(
    permittedKeys.map(n => [n, agoricIssuers[n]]),
  );
  // @ts-expect-error by construction
  return issuerKeywordRecord;
};

/**
 * @template {string} CN
 * @template {ContractStartFunction} SF
 * @template {CopyRecord} CFG
 * @template {PermitG} P
 * @param {CN} name
 * @param {CFG} deployConfigShape
 * @param {P} permitG
 * @param {MakePrivateArgs<SF, CFG>} makePrivateArgs
 * @param {CorePowersG<CN, SF, P> & BootstrapPowers & ChainStoragePowers} powers
 * @param {{ options: LegibleCapData<CFG> }} configStruct
 * @returns {Promise<{ config: any, kit: UpgradeKit<SF> }>}
 */
export const startOrchContract = async (
  name,
  deployConfigShape,
  permitG,
  makePrivateArgs,
  {
    produce,
    consume,
    installation: {
      consume: { [name]: installationP },
    },
    instance: {
      produce: { [name]: produceInstance },
    },
  },
  configStruct,
) => {
  trace('startOrchContract');

  const { agoricNames, zoe } = consume;
  const issuerKeywordRecord = await permittedIssuers(agoricNames, permitG);

  /** @type {Promise<NameHub>} */
  const brandHub = E(agoricNames).lookup('brand');
  const xVatEntries = await E(brandHub).entries();
  const config = fromExternalConfig(
    configStruct.options,
    fromEntries(xVatEntries),
    deployConfigShape,
  );
  const { terms: customTerms } = config;
  trace('using terms', customTerms);

  const { chainStorage, board } = consume;
  const { storageNode, marshaller } = await makePublishingStorageKit(name, {
    board,
    chainStorage,
  });

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
  const installation = await installationP;
  const kit = await E(startUpgradable)({
    label: name,
    installation,
    issuerKeywordRecord,
    terms: customTerms,
    privateArgs,
  });
  const { instance } = kit;

  /** @type {UpgradeKit<SF>} */
  const fullKit = harden({ ...kit, privateArgs });
  // @ts-expect-error XXX tsc gets confused?
  produce[`${name}Kit`].resolve(fullKit);

  produceInstance.reset();
  produceInstance.resolve(instance);

  const [installationId, instanceId, terms, bundleId] = await Promise.all([
    E(board).getId(instance),
    E(board).getId(installation),
    E(zoe).getTerms(instance),
    E(zoe).getBundleIDFromInstallation(installation),
  ]);

  trace(
    'startOrchContract done',
    name,
    { instanceId, installationId, bundleId },
    terms,
    objectMap(fullKit, it => passStyleOf(it)),
  );
  return { config, kit: fullKit };
};
harden(startOrchContract);

/**
 * @template {CopyRecord} CFG
 * @template {PermitG} P
 * @template {string} CN
 * @param {{ name: string }} startFn
 * @param {P} permit
 * @param {CN} contractName
 * @returns {(powers: { restoreRef: (b: VatSourceRef) => Promise<Installation<any>> },
 *            config: { bundleRefs: Record<CN, VatSourceRef>, options: LegibleCapData<CFG> }) => any}
 */
export const makeGetManifest = (startFn, permit, contractName) => {
  /**
   * @param {{ restoreRef: (b: VatSourceRef) => Promise<Installation<any>> }} powers
   * @param {{ bundleRefs: Record<CN, VatSourceRef>, options: LegibleCapData<CFG> }} config
   */
  const getManifestForOrch = ({ restoreRef }, { bundleRefs, options }) => {
    return {
      /** @type {BootstrapManifest} */
      manifest: { [startFn.name]: permit },
      installations: { [contractName]: restoreRef(bundleRefs[contractName]) },
      options,
    };
  };
  harden(getManifestForOrch);

  return getManifestForOrch;
};

// XXX copied from chain-hub.js
/**
 * Utility to reverse connection info perspective.
 */
/**
 * @param {IBCConnectionInfo} connInfo
 * @returns {IBCConnectionInfo}
 */
const reverseConnInfo = connInfo => {
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

/**
 * Parse a connection key to extract the two chain IDs
 *
 * @param {string} connKey - Connection key like "agoric-3_evmos__9001-2"
 * @returns {[string, string]} - [chainId1, chainId2] tuple
 */
const parseConnectionKey = connKey => {
  // Split on single underscore that's not followed by another underscore
  const parts = connKey.split(/(?<!_)_(?!_)/);

  if (parts.length !== 2) {
    throw new Error(`Invalid connection key format: ${connKey}`);
  }

  // Unescape doubled underscores
  const c1 = parts[0].replace(/__/g, '_');
  const c2 = parts[1].replace(/__/g, '_');

  return [c1, c2];
};

/**
 * @param {Record<string, ChainInfo>} plainInfo
 * @param {Record<string, IBCConnectionInfo>} connInfos
 * @returns {Record<string, ChainInfo>}
 */
export const mixConnections = (plainInfo, connInfos) => {
  const chainInfos = { ...plainInfo };
  for (const [connKey, directed] of entries(connInfos)) {
    // primary, counterparty
    const [p, c] = parseConnectionKey(connKey);
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

/**
 *
 * @param {Remote<NameHub>} agoricNames
 * @param {Record<string, string[]>} tokenMap
 */
export const lookupInterchainInfo = async (
  agoricNames,
  tokenMap = { agoric: ['ubld'], noble: ['uusdc'] },
) => {
  await null;
  const plainInfos = /** @type {Record<string, ChainInfo>} */ (
    fromEntries(await E(E(agoricNames).lookup('chain')).entries())
  );
  const connInfos = /** @type {Record<string, IBCConnectionInfo>} */ (
    fromEntries(await E(E(agoricNames).lookup('chainConnection')).entries())
  );

  const chainInfos = mixConnections(plainInfos, connInfos);

  return harden({
    chainInfo: chainInfos,
    assetInfo: makeAssetInfo(chainInfos, tokenMap),
  });
};

/** @satisfies {BootstrapManifestPermit} */
export const orchPermit = /** @type {const} */ ({
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
});
harden(orchPermit);
