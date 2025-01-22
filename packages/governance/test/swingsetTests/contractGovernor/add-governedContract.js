// import { makeHelpers } from '@agoric/deploy-script-support';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { E } from '@endo/far';

import { CONTRACT_ELECTORATE, ParamTypes } from '@agoric/governance';
import { MALLEABLE_NUMBER } from '@agoric/governance/test/swingsetTests/contractGovernor/governedContract.js';

const trace = makeTracer('GovC-coreEval', true);

/**
 * @typedef {PromiseSpaceOf<{
 *   auctionUpgradeNewInstance: Instance;
 *   auctionUpgradeNewGovCreator: any;
 *   newContractGovBundleId: string;
 *   retiredContractInstances: MapStore<string, Instance>;
 * }>} interlockPowers
 */

/**
 * @param {import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapPowers &
 *   interlockPowers} powers
 * @param {{
 *   options: {
 *     contractInstallation: Installation;
 *     producedKey: string | undefined;
 *     label: string | undefined;
 *   };
 * }} options
 */
export const startGovernedInstance = async (
  {
    consume: {
      agoricNames,
      board,
      chainTimerService: chainTimerServiceP,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      governedContractKits: governedContractKitsP,
      zoe,
    },
    produce,
  },
  {
    options: { contractInstallation, producedKey, label = 'governedContract' },
  },
) => {
  trace('Governed Contract start');

  const poserInvitationP = E(electorateCreatorFacet).getPoserInvitation();
  const [chainTimerService, poserInvitation, governedContractKits] =
    await Promise.all([
      chainTimerServiceP,
      poserInvitationP,
      governedContractKitsP,
    ]);

  const invitationIssuer = await E(zoe).getInvitationIssuer();
  const invitationAmount =
    await E(invitationIssuer).getAmountOf(poserInvitation);

  const governedTerms = {
    governedParams: {
      [MALLEABLE_NUMBER]: {
        type: ParamTypes.NAT,
        value: 602214090000000000000000n,
      },
      [CONTRACT_ELECTORATE]: {
        type: ParamTypes.INVITATION,
        value: invitationAmount,
      },
    },
  };

  const governorTerms = {
    chainTimerService,
    governedContractInstallation: contractInstallation,
    governed: {
      terms: governedTerms,
      issuerKeywordRecord: {},
      label,
    },
  };

  const governorInstallation = await E(agoricNames).lookup(
    'installation',
    'contractGovernor',
  );

  const governorStartResult = await E(zoe).startInstance(
    governorInstallation,
    {},
    governorTerms,
    {
      // electorateCreatorFacet,
      governed: {
        initialPoserInvitation: poserInvitation,
      },
    },
    `${label}.governor`,
  );

  const kit = await deeplyFulfilledObject(
    harden({
      label,
      creatorFacet: E(governorStartResult.creatorFacet).getCreatorFacet(),
      adminFacet: E(governorStartResult.creatorFacet).getAdminFacet(),
      publicFacet: E(governorStartResult.creatorFacet).getPublicFacet(),
      instance: E(governorStartResult.creatorFacet).getInstance(),

      governor: governorStartResult.instance,
      governorCreatorFacet: governorStartResult.creatorFacet,
      governorAdminFacet: governorStartResult.adminFacet,
    }),
  );

  governedContractKits.init(kit.instance, kit);

  if (producedKey !== undefined) {
    const boardID = await E(board).getId(kit.instance);
    trace({ boardID });
    produce[producedKey].reset();
    produce[producedKey].resolve({ ...kit, boardID });
  }
};

/**
 * Add a new auction to a chain that already has one.
 *
 * @param {object} utils
 * @param {any} utils.restoreRef
 * @param {any} addAuctionOptions
 */
export const getManifestForGovernedContract = async (
  { restoreRef },
  { contractBundleRef, producedKey, label },
) => {
  const contractInstallation = restoreRef(contractBundleRef);
  return {
    manifest: {
      [startGovernedInstance.name]: {
        consume: {
          agoricNames: true,
          board: true,
          chainTimerService: true,
          economicCommitteeCreatorFacet: true,
          governedContractKits: true,
          zoe: true,
        },
        produce: producedKey === undefined ? {} : { [producedKey]: true },
      },
    },
    // XXX we should be able to receive contractGovernorInstallation via
    // installations.consume, but the received installation isn't right.
    options: { contractInstallation, producedKey, label },
  };
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async (
  { publishRef, install },
  [producedKey, label = producedKey] = [],
) => {
  const { getSpecifier } = await import('@agoric/internal/src/module-utils.js');
  const SELF = await getSpecifier(import.meta.url);

  return harden({
    sourceSpec: SELF,
    getManifestCall: [
      getManifestForGovernedContract.name,
      {
        contractBundleRef: publishRef(
          install(
            '@agoric/governance/test/swingsetTests/contractGovernor/governedContract.js',
          ),
        ),
        governorBundleRef: publishRef(
          install('@agoric/governance/src/contractGovernor.js'),
        ),
        producedKey,
        label,
      },
    ],
  });
};

/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').DeployScriptFunction} */
export default async (homeP, endowments) => {
  const { scriptArgs } = endowments;
  const dspModule = await import('@agoric/deploy-script-support');
  const { makeHelpers } = dspModule;
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval(startGovernedInstance.name, utils =>
    defaultProposalBuilder(utils, scriptArgs),
  );
};
