// @ts-check

import '@agoric/governance/src/exported.js';
import '@agoric/zoe/exported.js';
import '@agoric/zoe/src/contracts/exported.js';

import { E, Far } from '@endo/far';

/**
 * @file
 *
 * This extremely quick and dirty contract simplifies the process of
 * calling for votes on changes to the economy by gathering the governor creator
 * facets in one place and invokes `voteOnParamChanges` and
 * `voteOnApiInvocation` on each when requested. A cleaner version would
 * validate parameters, constrain deadlines and probably split the ability to
 * call for vote into separate capabilities for finer grain encapsulation.
 */

/**
 * @param {ZCF<{binaryVoteCounterInstallation:Installation}>} zcf
 * @param {{reserve:GovernedContractFacetAccess<unknown>, amm:GovernedCreatorFacet<unknown>, vaults:GovernedCreatorFacet<unknown>}} privateArgs
 */
export const start = async (zcf, privateArgs) => {
  const { binaryVoteCounterInstallation: counter } = zcf.getTerms();
  const { reserve, amm, vaults } = privateArgs;

  const voteOnParamChanges = (
    target,
    params,
    path = { paramPath: { key: 'governedApi' } },
    deadline,
  ) => {
    return E(target).voteOnParamChanges(counter, deadline, {
      paramPath: path,
      changes: params,
    });
  };

  const voteOnApiInvocation = (contract, method, amounts, deadline) => {
    return E(contract).voteOnApiInvocation(method, amounts, counter, deadline);
  };

  const makeNullInvitation = () => {
    return zcf.makeInvitation(() => {},
    'identifies the voting contract instance');
  };

  const publicFacet = Far('votingAPI', {
    voteOnAmmParamChanges: params => voteOnParamChanges(amm, params),
    voteOnReserveParamChanges: params => voteOnParamChanges(reserve, params),
    // vote on param changes for a vaultManager
    voteOnVaultParamChanges: (params, brand) =>
      voteOnParamChanges(vaults, params, { paramPath: { key: brand } }),
    // vote on param changes across the vaultFactory
    voteOnVaultFactoryParamChanges: params =>
      voteOnParamChanges(vaults, params),
    voteOnReserveApiInvocation: (amounts, deadline) =>
      voteOnApiInvocation(reserve, 'addLiquidityToAmmPool', amounts, deadline),
    makeNullInvitation,
  });

  return { publicFacet };
};
