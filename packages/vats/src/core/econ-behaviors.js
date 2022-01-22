// @ts-check

import { E } from '@agoric/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { installOnChain as installVaultFactoryOnChain } from '@agoric/run-protocol/bundles/install-on-chain.js';
import { bootstrapAttestation } from '@agoric/zoe/src/contracts/attestation/bootstrapAttestation.js';
import { bootstrapRunLoC } from '@agoric/run-protocol/src/bootstrapRunLoC.js';
import attestationBundle from '@agoric/zoe/bundles/bundle-attestation.js';
import getRUNBundle from '@agoric/run-protocol/bundles/bundle-getRUN.js';
import contractGovernorBundle from '@agoric/run-protocol/bundles/bundle-contractGovernor.js';
import committeeBundle from '@agoric/run-protocol/bundles/bundle-committee.js';
import { makeStakeReporter } from '../my-lien.js';
import { CENTRAL_ISSUER_NAME, collectNameAdmins, shared } from './utils.js';
import { BLD_ISSUER_ENTRY } from '../issuers.js';

/**
 * @param {{
 *   consume: {
 *    agoricNames: ERef<NameHub>,
 *    nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 *    board: ERef<Board>,
 *    chainTimerService: ERef<TimerService>,
 *    loadVat: ERef<VatLoader<unknown>>,
 *    zoe: ERef<ZoeService>,
 *    feeMintAccess: ERef<FeeMintAccess>,
 *   }
 * }} powers
 */
export const startVaultFactory = async ({
  consume: {
    agoricNames,
    nameAdmins: nameAdminsP,
    board,
    chainTimerService,
    loadVat,
    zoe,
    feeMintAccess: feeMintAccessP,
  },
}) => {
  // TODO: Zoe should accept a promise, since the value is in that vat.
  const [feeMintAccess, nameAdmins] = await Promise.all([
    feeMintAccessP,
    nameAdminsP,
  ]);

  /** @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat todo */
  const { priceAuthority, adminFacet: _priceAuthorityAdmin } = await E(
    /** @type { PriceAuthorityVat } */ (E(loadVat)('priceAuthority')),
  ).makePriceAuthority();

  return installVaultFactoryOnChain({
    agoricNames,
    board,
    centralName: CENTRAL_ISSUER_NAME,
    chainTimerService,
    nameAdmins,
    priceAuthority,
    zoe,
    bootstrapPaymentValue: 0n, // TODO: this is obsolete, right?
    feeMintAccess,
  });
};
harden(startVaultFactory);

/**
 * @param {{
 *   consume: {
 *     agoricNames: ERef<NameHub>,
 *     bridgeManager: ERef<import('../bridge.js').BridgeManager>,
 *     client: ERef<ClientManager>,
 *     nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 *     zoe: ERef<ZoeService>,
 *   }
 * }} powers
 */
export const startAttestation = async ({
  consume: { agoricNames, bridgeManager, client, nameAdmins, zoe },
}) => {
  const [stakeName] = BLD_ISSUER_ENTRY;
  const [
    stakeBrand,
    stakeIssuer,
    [brandAdmin, issuerAdmin, installAdmin, instanceAdmin],
  ] = await Promise.all([
    E(agoricNames).lookup('brand', stakeName),
    E(agoricNames).lookup('issuer', stakeName),
    collectNameAdmins(
      ['brand', 'issuer', 'installation', 'instance'],
      agoricNames,
      nameAdmins,
    ),
  ]);

  const reporter = makeStakeReporter(bridgeManager, stakeBrand);

  const {
    installation,
    instance,
    issuer,
    brand,
    creatorFacet,
  } = await bootstrapAttestation(
    attestationBundle,
    zoe,
    stakeIssuer,
    reporter,
    {
      expiringAttName: 'BldAttGov', // ISSUE: passe. get rid of this?
      returnableAttName: 'BldLienAtt',
    },
  );

  const key = 'Attestation';
  assert(shared.contract[key]);
  return Promise.all([
    E(brandAdmin).update(key, brand),
    E(issuerAdmin).update(key, issuer),
    E(installAdmin).update(key, installation),
    E(instanceAdmin).update(key, instance),
    E(client).assignBundle({
      attMaker: address => E(creatorFacet).getAttMaker(address),
    }),
  ]);
};
harden(startAttestation);

/**
 * @param {{ consume: {
 *   zoe: ERef<ZoeService>,
 *   agoricNames: ERef<NameHub>,
 *   nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 * }}} powers
 */
export const installEconomicGovernance = async ({
  consume: { zoe, agoricNames, nameAdmins },
}) => {
  const [contractGovernorInstall, committeeInstall] = await Promise.all([
    E(zoe).install(contractGovernorBundle),
    E(zoe).install(committeeBundle),
  ]);

  const [installAdmin] = await collectNameAdmins(
    ['installation'],
    agoricNames,
    nameAdmins,
  );

  assert(shared.contract.contractGovernor);
  assert(shared.contract.committee);
  return Promise.all([
    E(installAdmin).update('contractGovernor', contractGovernorInstall),
    E(installAdmin).update('committee', committeeInstall),
  ]);
};
harden(installEconomicGovernance);

/**
 * @param {{ consume: {
 *   zoe: ERef<ZoeService>,
 *   feeMintAccess: ERef<FeeMintAccess>,
 *   agoricNames: ERef<NameHub>,
 *   chainTimerService: ERef<TimerService>,
 *   nameAdmins: ERef<Store<NameHub, NameAdmin>>,
 * }}} powers
 */
export const startGetRun = async ({
  consume: {
    zoe,
    // ISSUE: is there some reason Zoe shouldn't await this???
    feeMintAccess: feeMintAccessP,
    agoricNames,
    chainTimerService,
    nameAdmins,
  },
}) => {
  const [
    feeMintAccess,
    attIssuer,
    bldBrand,
    runBrand,
    governor,
    electorate,
    installation,
  ] = await Promise.all([
    feeMintAccessP,
    E(agoricNames).lookup('issuer', 'Attestation'),
    E(agoricNames).lookup('brand', 'BLD'),
    E(agoricNames).lookup('brand', 'RUN'),
    // TODO: manage string constants that need to match
    E(agoricNames).lookup('installation', 'contractGovernor'),
    E(agoricNames).lookup('installation', 'committee'),
    E(zoe).install(getRUNBundle),
  ]);
  const collateralPrice = makeRatio(65n, runBrand, 100n, bldBrand); // arbitrary price
  const collateralizationRatio = makeRatio(5n, runBrand, 1n); // arbitrary raio

  const installations = {
    governor,
    electorate,
    getRUN: installation,
  };

  // TODO: finish renaming bootstrapRunLoC etc.
  const { instance } = await bootstrapRunLoC(
    zoe,
    chainTimerService,
    feeMintAccess,
    installations,
    { collateralPrice, collateralizationRatio },
    attIssuer,
  );

  const [installAdmin, instanceAdmin] = await collectNameAdmins(
    ['installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  const key = 'getRUN';
  assert(shared.contract[key]);
  return Promise.all([
    E(installAdmin).update(key, installation),
    E(instanceAdmin).update(key, instance),
  ]);
};
harden(startGetRun);
