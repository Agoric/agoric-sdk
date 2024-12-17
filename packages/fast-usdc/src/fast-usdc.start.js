import { deeplyFulfilledObject, makeTracer, objectMap } from '@agoric/internal';
import { Fail } from '@endo/errors';
import { E } from '@endo/far';
import { makeMarshal } from '@endo/marshal';
import { M, mustMatch } from '@endo/patterns';
import {
  finishDeploy,
  makePrivateArgs,
  meta,
  permit,
} from './fast-usdc.contract.meta.js';
import { fromExternalConfig } from './utils/config-marshal.js';

/**
 * @import {CopyRecord} from '@endo/pass-style';
 * @import {TypedPattern} from '@agoric/internal';
 * @import {OrchestrationPowers} from '@agoric/orchestration';
 * @import {ContractStartFunction, Instance, StartParams, StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils'
 * @import {DepositFacet} from '@agoric/ertp/src/types.js'
 * @import {Board} from '@agoric/vats'
 * @import {ManifestBundleRef} from '@agoric/deploy-script-support/src/externalTypes.js'
 * @import {BootstrapManifest} from '@agoric/vats/src/core/lib-boot.js'
 * @import {LegibleCapData} from './utils/config-marshal.js'
 *
 * TODO: re-export these from .meta with generic names
 * @import {FastUSDCConfig as ContractConfig} from './types.js'
 * @import {FastUsdcSF as TheSF} from './fast-usdc.contract.js';
 */

const { entries, fromEntries, keys, values } = Object; // XXX move up

const contractName = meta.name;
/** @typedef {typeof meta.name} TheContractName */

const trace = makeTracer(`${meta.abbr}-Start`, true);

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

const BOARD_AUX = 'boardAux';
const marshalData = makeMarshal(_val => Fail`data only`);
/**
 * @param {Brand} brand
 * @param {Pick<BootstrapPowers['consume'], 'board' | 'chainStorage'>} powers
 */
const publishDisplayInfo = async (brand, { board, chainStorage }) => {
  // chainStorage type includes undefined, which doesn't apply here.
  // @ts-expect-error UNTIL https://github.com/Agoric/agoric-sdk/issues/8247
  const boardAux = E(chainStorage).makeChildNode(BOARD_AUX);
  const [id, displayInfo, allegedName] = await Promise.all([
    E(board).getId(brand),
    E(brand).getDisplayInfo(),
    E(brand).getAllegedName(),
  ]);
  const node = E(boardAux).makeChildNode(id);
  const aux = marshalData.toCapData(harden({ allegedName, displayInfo }));
  await E(node).setValue(JSON.stringify(aux));
};

/**
 * @param {string} role
 * @param {ERef<BootstrapPowers['consume']['namesByAddress']>} namesByAddress
 * @param {Record<string, string>} nameToAddress
 */
const makeAdminRole = (role, namesByAddress, nameToAddress) => {
  const lookup = async () => {
    trace('look up deposit facets for', role);
    return deeplyFulfilledObject(
      objectMap(nameToAddress, async address => {
        /** @type {DepositFacet} */
        const depositFacet = await E(namesByAddress).lookup(
          address,
          'depositFacet',
        );
        return depositFacet;
      }),
    );
  };
  const lookupP = lookup();

  return harden({
    lookup: () => lookupP,
    /** @param {(addr: string) => Promise<Invitation>} makeInvitation */
    send: async makeInvitation => {
      const oracleDepositFacets = await lookupP;
      await Promise.all(
        entries(oracleDepositFacets).map(async ([name, depositFacet]) => {
          const address = nameToAddress[name];
          trace('making invitation for', role, name, address);
          const toWatch = await makeInvitation(address);

          const amt = await E(depositFacet).receive(toWatch);
          trace('sent', amt, 'to', role, name);
        }),
      );
    },
  });
};

/**
 * @typedef { typeof permit.issuer.produce } PermittedIssuers
 * @typedef { PromiseSpaceOf<Record<`${TheContractName}Kit`, TheContractKit>> & {
 *   installation: PromiseSpaceOf<Record<TheContractName, Installation<TheSF>>>;
 *   instance: PromiseSpaceOf<Record<TheContractName, Instance<TheSF>>>;
 *   issuer: PromiseSpaceOf<Record<keyof typeof permit.issuer.produce, Issuer>>;
 *   brand: PromiseSpaceOf<Record<keyof typeof permit.brand.produce, Brand>>;
 * }} ExtraCorePowers
 *
 * @typedef {StartedInstanceKit<TheSF> & {
 *   label: string,
 *   privateArgs: StartParams<TheSF>['privateArgs'];
 * }} TheContractKit
 */

/**
 * @template {{}} T
 * @param {T} obj
 * @param {<K extends keyof T>(entry: [k: K, v: T[K]], index: number, es: [PropertyKey, unknown][]) => Partial<T>} pred
 * @returns {Partial<T>}
 */
const objectFilter = (obj, pred) => {
  /** @type {Partial<T>} */
  // @ts-expect-error pred type too narrow
  const found = harden(fromEntries(entries(obj).filter(pred)));
  return found;
};

/**
 * @template {PermitG} P
 * @param {Pick<BootstrapPowers['consume'], 'agoricNames'>} consume
 * @param {P} permitG
 */
export const permittedIssuers = async ({ agoricNames }, permitG) => {
  const permittedKeys = keys(permitG?.issuer?.consume || {});
  const agoricIssuers = await E(E(agoricNames).lookup('issuer')).entries();
  /** @type {Record<keyof P['issuer']['produce'], Issuer>} */
  // @ts-expect-error by construction
  const issuerKeywordRecord = fromEntries(
    agoricIssuers.filter(([n, _v]) => permittedKeys.includes(n)),
  );
  return issuerKeywordRecord;
};

/**
 * @template {string} CN contract name
 * @template {ContractStartFunction} SF typeof start
 * @template {CopyRecord} CFG
 * @typedef {ContractMeta & {name: CN} & {
 *   adminRoles?: Record<keyof CFG, keyof StartedInstanceKit<SF>['creatorFacet']>,
 *   deployConfigShape?: TypedPattern<CFG>,
 * }} ContractMetaG
 */

/**
 * @template {ContractStartFunction} SF typeof start
 * @typedef {StartedInstanceKit<SF> & {
 *   label: string,
 *   privateArgs: Parameters<SF>[1];
 * }} UpgradeKit
 *
 */

/**
 * @typedef {BootstrapManifest &
 *   { issuer: BootstrapManifest} &
 *   { brand: BootstrapManifest }
 * } PermitG generic permit constraints
 */

/**
 * @template {string} CN contract name
 * @template {ContractStartFn} SF typeof start
 * @template {PermitG} P permit
 * @typedef { PromiseSpaceOf<Record<`${CN}Kit`, UpgradeKit<SF>>> & {
 *   installation: PromiseSpaceOf<Record<CN, Installation<SF>>>;
 *   instance: PromiseSpaceOf<Record<CN, Instance<SF>>>;
 *   issuer: PromiseSpaceOf<Record<keyof P['issuer']['produce'], Issuer>>;
 *   brand: PromiseSpaceOf<Record<keyof P['brand']['produce'], Brand>>;
 * }} CorePowersG
 */

/**
 * @template {ContractStartFn} SF typeof start
 * @template {CopyRecord} CFG
 * @typedef {(op: OrchestrationPowers, m: Marshaller, cfg: CFG, log: typeof trace) => Parameters<SF>[1]} MakePrivateArgs
 */

/**
 * @throws if admin role smart wallets are not yet provisioned
 *
 * @template {string} CN contract name
 * @template {ContractStartFn} SF typeof start
 * @template {CopyRecord} CFG
 * @template {PermitG} P permit
 * @param {ContractMetaG<CN, SF, CFG>} metaG
 * @param {P} permitG
 * @param {MakePrivateArgs<SF, CFG>} makePrivateArgsG
 * @param {CorePowersG<CN, SF, P> & BootstrapPowers} powers
 * @param {{ options: LegibleCapData<CFG> }} config
 */
export const startOrchContractG = async (
  metaG,
  permitG,
  makePrivateArgsG,
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
  },
  config,
) => {
  trace('startOrchContract');

  const issuerKeywordRecord = await permittedIssuers(consume, permitG);

  const { agoricNames, board } = consume;
  const xVatContext = await E(E(agoricNames).lookup('brand')).entries();
  const internalConfig = fromExternalConfig(
    config.options,
    xVatContext,
    metaG.deployConfigShape,
  );
  const { terms } = internalConfig;
  trace('using terms', terms);

  const adminRoles = objectMap(metaG?.adminRoles || {}, (_method, role) => {
    const nameToAddress = internalConfig[role];
    mustMatch(nameToAddress, M.recordOf(M.string(), M.string()));
    return makeAdminRole(
      /** @type {string} */ (role), // XXX tsc gets confused?
      consume.namesByAddress,
      nameToAddress,
    );
  });

  await Promise.all(values(adminRoles).map(r => r.lookup()));

  /** @type {{ chainStorage: Promise<StorageNode>}} */
  // @ts-expect-error Promise<null> case is vestigial
  const { chainStorage } = consume;
  const { storageNode, marshaller } = await makePublishingStorageKit(
    meta.name,
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
  const privateArgs = await makePrivateArgsG(
    orchestrationPowers,
    marshaller,
    internalConfig,
    trace,
  );

  const { startUpgradable, zoe } = consume;
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

  const newIssuerNames = keys(permit?.issuer?.produce || {}).filter(
    n => permit?.brand?.produce?.[n],
  );
  if (newIssuerNames.length > 0) {
    const { issuers, brands } = await E(zoe).getTerms(instance);
    for (const name of newIssuerNames) {
      console.log('new well-known Issuer, Brand:', name);
      produceIssuer[name].reset();
      produceIssuer[name].resolve(issuers[name]);
      produceBrand[name].reset();
      produceBrand[name].resolve(brands[name]);
      await publishDisplayInfo(brands[name], { board, chainStorage });
    }
  }

  for (const [role, method] of entries(meta.adminRoles)) {
    await adminRoles[role].send(addr => E(creatorFacet)[method](addr));
  }

  produceInstance.reset();
  produceInstance.resolve(instance);

  trace('startOrchContract done', instance);
  return { config: internalConfig, kit };
};
harden(startOrchContractG);

/**
 * @throws if admin role smart wallets are not yet provisioned
 *
 * @param {BootstrapPowers & ExtraCorePowers } powers
 * @param {{ options: LegibleCapData<ContractConfig> }} config
 */
export const startOrchContract = async (
  {
    produce,
    consume: {
      agoricNames,
      namesByAddress,
      board,
      chainStorage,
      chainTimerService: timerService,
      localchain,
      cosmosInterchainService,
      startUpgradable,
      zoe,
    },
    issuer: { produce: produceIssuer },
    brand: { produce: produceBrand },
    installation: {
      consume: { [contractName]: installation },
    },
    instance: {
      produce: { [contractName]: produceInstance },
    },
  },
  config,
) => {
  trace('startOrchContract');

  const xVatContext = await E(E(agoricNames).lookup('brand')).entries();
  const internalConfig = fromExternalConfig(
    config.options,
    xVatContext,
    meta.deployConfigShape,
  );
  const { terms } = internalConfig;
  trace('using terms', terms);

  const adminRoles = objectMap(meta?.adminRoles || {}, (_method, role) => {
    const nameToAddress = internalConfig[role];
    mustMatch(nameToAddress, M.recordOf(M.string(), M.string()));
    return makeAdminRole(role, namesByAddress, nameToAddress);
  });

  await Promise.all(values(adminRoles).map(r => r.lookup()));

  const { storageNode, marshaller } = await makePublishingStorageKit(
    contractName,
    {
      board,
      // @ts-expect-error Promise<null> case is vestigial
      chainStorage,
    },
  );

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
    internalConfig,
    trace,
  );

  const permittedIssuers = keys(permit?.issuer?.consume || {});
  const agoricIssuers = await E(E(agoricNames).lookup('issuer')).entries();
  const issuerKeywordRecord = fromEntries(
    agoricIssuers.filter(([n, _v]) => permittedIssuers.includes(n)),
  );

  const kit = await E(startUpgradable)({
    label: contractName,
    installation,
    issuerKeywordRecord,
    terms,
    privateArgs,
  });
  const { instance, creatorFacet } = kit;
  /** @type {TheContractKit} */
  const fullKit = harden({ ...kit, privateArgs });
  produce[`${contractName}Kit`].resolve(fullKit);

  const newIssuerNames = keys(permit?.issuer?.produce || {}).filter(
    n => permit?.brand?.produce?.[n],
  );
  if (newIssuerNames.length > 0) {
    const { issuers, brands } = await E(zoe).getTerms(instance);
    for (const name of newIssuerNames) {
      console.log('new well-known Issuer, Brand:', name);
      produceIssuer[name].reset();
      produceIssuer[name].resolve(issuers[name]);
      produceBrand[name].reset();
      produceBrand[name].resolve(brands[name]);
      await publishDisplayInfo(brands[name], { board, chainStorage });
    }
  }

  for (const [role, method] of entries(meta.adminRoles)) {
    await adminRoles[role].send(addr => E(creatorFacet)[method](addr));
  }

  await finishDeploy(internalConfig, fullKit, trace);

  produceInstance.reset();
  produceInstance.resolve(instance);

  trace('startOrchContract done', instance);
};
harden(startOrchContract);

/**
 * @param {{
 *   restoreRef: (b: ERef<ManifestBundleRef>) => Promise<Installation>;
 * }} utils
 * @param {{
 *   installKeys: Record<TheContractName, ERef<ManifestBundleRef>>;
 *   options: LegibleCapData<ContractConfig>;
 * }} param1
 */
// TODO: rename to getManifestForOrchContract
export const getManifestForFastUSDC = (
  { restoreRef },
  { installKeys, options },
) => {
  return {
    /** @type {BootstrapManifest} */
    manifest: { [startOrchContract.name]: permit },
    installations: { [contractName]: restoreRef(installKeys[contractName]) },
    options,
  };
};
