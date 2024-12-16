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
 * @import {Instance, StartParams, StartedInstanceKit} from '@agoric/zoe/src/zoeService/utils'
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
