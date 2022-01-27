// @ts-check

import { E } from '@endo/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { installOnChain as installVaultFactoryOnChain } from '@agoric/run-protocol/bundles/install-on-chain.js';
import { bootstrapRunLoC } from '@agoric/run-protocol/src/bootstrapRunLoC.js';
import getRUNBundle from '@agoric/run-protocol/bundles/bundle-getRUN.js';
import contractGovernorBundle from '@agoric/run-protocol/bundles/bundle-contractGovernor.js';
import committeeBundle from '@agoric/run-protocol/bundles/bundle-committee.js';
import { makeStakeReporter } from '../my-lien.js';
import { CENTRAL_ISSUER_NAME, collectNameAdmins, shared } from './utils.js';
import { BLD_ISSUER_ENTRY } from '../issuers.js';

/** @param {BootstrapPowers} powers */
const startEconomicCommittee = async ({
  consume: { agoricNames, nameAdmins, zoe },
  produce: { economicCommitteeCreatorFacet },
}) => {
  const electorateTerms = {
    committeeName: 'Initial Economic Committee',
    committeeSize: 1,
  };

  const installation = E(zoe).install(committeeBundle);

  const { creatorFacet, instance } = await E(zoe).startInstance(
    installation,
    {},
    electorateTerms,
  );

  const [installAdmin, instanceAdmin] = await collectNameAdmins(
    ['installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  economicCommitteeCreatorFacet.resolve(creatorFacet);
  return Promise.all([
    E(installAdmin).update('committee', installation),
    E(instanceAdmin).update('economicCommittee', instance),
  ]);
};
harden(startEconomicCommittee);

/**
 *
/**
 * @param {BootstrapPowers & {
 *   consume: { loadVat: ERef<VatLoader<PriceAuthorityVat>>},
 * }} powers
 *
 * @typedef {ERef<ReturnType<import('../vat-priceAuthority.js').buildRootObject>>} PriceAuthorityVat
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
  produce: { priceAuthorityAdmin },
}) => {
  // TODO: Zoe should accept a promise, since the value is in that vat.
  const [feeMintAccess, nameAdmins] = await Promise.all([
    feeMintAccessP,
    nameAdminsP,
  ]);

  const { priceAuthority, adminFacet } = await E(
    E(loadVat)('priceAuthority'),
  ).makePriceAuthority();

  priceAuthorityAdmin.resolve(adminFacet);

  // TODO: refactor w.r.t. installEconomicGovernance below
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

/** @param {BootstrapPowers} powers */
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

/** @param {BootstrapPowers} powers */
export const startGetRun = async ({
  consume: {
    zoe,
    // ISSUE: is there some reason Zoe shouldn't await this???
    feeMintAccess: feeMintAccessP,
    agoricNames,
    bridgeManager,
    client,
    chainTimerService,
    nameAdmins,
  },
}) => {
  const [stakeName] = BLD_ISSUER_ENTRY;

  const [
    feeMintAccess,
    bldIssuer,
    bldBrand,
    runBrand,
    governor,
    electorate,
    installation,
  ] = await Promise.all([
    feeMintAccessP,
    E(agoricNames).lookup('issuer', stakeName),
    E(agoricNames).lookup('brand', stakeName),
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
  const { instance, publicFacet, creatorFacet } = await bootstrapRunLoC(
    zoe,
    chainTimerService,
    feeMintAccess,
    installations,
    { collateralPrice, collateralizationRatio },
    bldIssuer,
  );
  const attIssuer = E(publicFacet).getIssuer();
  const attBrand = await E(attIssuer).getBrand();

  const reporter = makeStakeReporter(bridgeManager, bldBrand);

  const [
    brandAdmin,
    issuerAdmin,
    installAdmin,
    instanceAdmin,
  ] = await collectNameAdmins(
    ['brand', 'issuer', 'installation', 'instance'],
    agoricNames,
    nameAdmins,
  );

  const key = 'getRUN';
  const attKey = 'Attestation';
  assert(shared.contract[key]);
  assert(shared.assets[attKey]);
  return Promise.all([
    E(installAdmin).update(key, installation),
    E(instanceAdmin).update(key, instance),
    E(brandAdmin).update(attKey, attBrand),
    E(issuerAdmin).update(attKey, attIssuer),
    // @ts-ignore threading types thru governance is WIP
    E(creatorFacet).addAuthority(reporter),
    E(client).assignBundle({
      // @ts-ignore threading types thru governance is WIP
      attMaker: address => E(creatorFacet).getAttMaker(address),
    }),
  ]);
};
harden(startGetRun);
