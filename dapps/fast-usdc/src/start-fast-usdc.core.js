import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { FastUSDCConfigShape } from './type-guards.js';
import { fromExternalConfig } from './utils/config-marshal.js';
import {
  inviteOracles,
  publishDisplayInfo,
  publishFeedPolicy,
} from './utils/core-eval.js';

/**
 * @import {Brand, Issuer} from '@agoric/ertp';
 * @import {Instance, StartParams} from '@agoric/zoe/src/zoeService/utils.js'
 * @import {Board} from '@agoric/vats'
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 * @import {FastUsdcSF} from './fast-usdc.contract.js'
 * @import {FastUSDCConfig} from './types.js'
 */

const ShareAssetInfo = /** @type {const} */ harden({
  issuerName: 'FastLP',
  denom: 'ufastlp',
  assetKind: 'nat',
  decimalPlaces: 6,
});

const trace = makeTracer('FUSD-Start', true);

const contractName = 'fastUsdc';

/**
 * XXX Shouldn't the bridge or board vat handle this?
 *
 * @param {string} path
 * @param {{
 *   chainStorage: ERef<StorageNode>;
 *   board: ERef<Board>;
 * }} io
 */
const makePublishingStorageKit = async (path, { chainStorage, board }) => {
  const storageNode = await E(chainStorage).makeChildNode(path);

  const marshaller = await E(board).getPublishingMarshaller();
  return { storageNode, marshaller };
};

const POOL_METRICS = 'poolMetrics';

/**
 * @typedef { PromiseSpaceOf<{
 *   fastUsdcKit: FastUSDCKit
 *  }> & {
 *   installation: PromiseSpaceOf<{ fastUsdc: Installation<FastUsdcSF> }>;
 *   instance: PromiseSpaceOf<{ fastUsdc: Instance<FastUsdcSF> }>;
 *   issuer: PromiseSpaceOf<{ FastLP: Issuer }>;
 *   brand: PromiseSpaceOf<{ FastLP: Brand }>;
 * }} FastUSDCCorePowers
 *
 * @typedef {StartedInstanceKitWithLabel & {
 *   publicFacet: StartedInstanceKit<FastUsdcSF>['publicFacet'];
 *   creatorFacet: StartedInstanceKit<FastUsdcSF>['creatorFacet'];
 *   privateArgs: StartParams<FastUsdcSF>['privateArgs'];
 * }} FastUSDCKit
 */

/**
 * @throws if oracle smart wallets are not yet provisioned
 *
 * @param {BootstrapPowers & FastUSDCCorePowers } powers
 * @param {{ options: LegibleCapData<FastUSDCConfig> }} config
 */
export const startFastUSDC = async (
  {
    produce: { fastUsdcKit },
    consume: {
      agoricNames,
      namesByAddress,
      bankManager,
      board,
      chainStorage,
      chainTimerService: timerService,
      localchain,
      cosmosInterchainService,
      startUpgradable,
      zoe,
    },
    issuer: {
      produce: { FastLP: produceShareIssuer },
    },
    brand: {
      produce: { FastLP: produceShareBrand },
    },
    installation: {
      consume: { fastUsdc },
    },
    instance: {
      produce: { fastUsdc: produceInstance },
    },
  },
  config,
) => {
  trace('startFastUSDC');

  await null;
  /** @type {Issuer<'nat'>} */
  const USDCissuer = await E(agoricNames).lookup('issuer', 'USDC');
  const brands = harden({
    USDC: await E(USDCissuer).getBrand(),
  });

  const { terms, oracles, feeConfig, feedPolicy, ...net } = fromExternalConfig(
    config.options,
    brands,
    FastUSDCConfigShape,
  );
  trace('using terms', terms);
  trace('using fee config', feeConfig);

  const { storageNode, marshaller } = await makePublishingStorageKit(
    contractName,
    {
      board,
      // @ts-expect-error Promise<null> case is vestigial
      chainStorage,
    },
  );
  const poolMetricsNode = await E(storageNode).makeChildNode(POOL_METRICS);

  const privateArgs = await deeplyFulfilledObject(
    harden({
      agoricNames,
      feeConfig,
      localchain,
      orchestrationService: cosmosInterchainService,
      poolMetricsNode,
      storageNode,
      timerService,
      marshaller,
      chainInfo: net.chainInfo,
      assetInfo: net.assetInfo,
    }),
  );

  const kit = await E(startUpgradable)({
    label: contractName,
    installation: fastUsdc,
    issuerKeywordRecord: harden({ USDC: USDCissuer }),
    terms,
    privateArgs,
  });
  fastUsdcKit.resolve(harden({ ...kit, privateArgs }));
  const { instance, creatorFacet } = kit;

  await publishFeedPolicy(storageNode, feedPolicy);

  const {
    issuers: fastUsdcIssuers,
    brands: { PoolShares: shareBrand },
  } = await E(zoe).getTerms(instance);
  /** @type {{ PoolShares: Issuer<'nat'> }} */
  // @ts-expect-error see zcf.makeZCFMint(...) in fast-usdc.contract.js
  const { PoolShares: shareIssuer } = fastUsdcIssuers;
  produceShareIssuer.resolve(shareIssuer);
  produceShareBrand.resolve(shareBrand);
  await publishDisplayInfo(shareBrand, { board, chainStorage });

  const { denom, issuerName } = ShareAssetInfo;
  trace('addAsset', denom, shareBrand);
  await E(bankManager).addAsset(denom, issuerName, issuerName, {
    issuer: shareIssuer,
    brand: shareBrand,
  });

  await inviteOracles({ creatorFacet, namesByAddress }, oracles);

  produceInstance.reset();
  produceInstance.resolve(instance);

  const addresses = await E(kit.creatorFacet).publishAddresses();
  trace('contract orch account addresses', addresses);
  if (!net.noNoble) {
    const { agoric, noble } = privateArgs.chainInfo;
    const agoricToNoble = agoric.connections[noble.chainId];
    const addr = await E(kit.creatorFacet).connectToNoble(
      agoric.chainId,
      noble.chainId,
      agoricToNoble,
    );
    trace('noble intermediate recipient', addr);
  }
  trace('startFastUSDC done', instance);
};
harden(startFastUSDC);

/**
 * @param {{
 *   restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation>;
 * }} utils
 * @param {{
 *   installKeys: { fastUsdc: ERef<ManifestBundleRef> };
 *   options: LegibleCapData<FastUSDCConfig>;
 * }} param1
 */
export const getManifestForFastUSDC = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: {
      [startFastUSDC.name]: {
        produce: {
          fastUsdcKit: true,
        },
        consume: {
          bankManager: true, // to add FastLP as vbank asset

          chainStorage: true,
          chainTimerService: true,
          localchain: true,
          cosmosInterchainService: true,

          // limited distribution durin MN2: contract installation
          startUpgradable: true,
          zoe: true, // only getTerms() is needed. XXX should be split?

          // widely shared: name services
          agoricNames: true,
          namesByAddress: true,
          board: true,
        },
        issuer: {
          produce: { FastLP: true },
        },
        brand: {
          produce: { FastLP: true },
        },
        instance: {
          produce: { fastUsdc: true },
        },
        installation: {
          consume: { fastUsdc: true },
        },
      },
    },
    installations: {
      fastUsdc: restoreRef(installKeys.fastUsdc),
    },
    options,
  };
};
