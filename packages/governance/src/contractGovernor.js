// @ts-check

import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';
import { details as X } from '@agoric/assert';

import { setupGovernance } from './governParam';

/*
 * ContractManager is an ElectionManager that starts up a contract and hands its
 * own creator a facet that allows them to call for votes on parameters that
 * were declared by the contract.
 *
 * ContractManager is initialized by a call to startGovernedInstance() on this
 * contract's creatorFacet. That call initializes the registrar, and identifies
 * the Installation to be started.
 *
 * The governedContract is responsible for supplying getParamMgrAccessor() in
 * its creatorFacet. getParamMgrAccessor() takes a paramDesc, which identifies
 * the parameter to be voted on. If the contract has a single paramMgr, the
 * paramDesc can be just the parameter name. If the contract has more than one,
 * then it must accept enough details to identify the paramMgr and parameter.
 *
 * The call to startGovernedInstance() returns a facet with voteOnParamChange(),
 * which is used to create ballot questions that will automatically update
 * contract parameters if passed.
 *
 * The contract's terms will include the instance of this contract so clients
 *  will be able to see the state of the governed parameters.
 *
 * @type {ContractStartFn}
 */
const start = async zcf => {
  const zoe = zcf.getZoeService();
  let registrar;
  let governedInstance;

  const startGovernedInstance = async (
    registrarCreatorFacet,
    governedContractInstallation,
    issuerKeywordRecord,
    customTerms,
  ) => {
    assert(!registrar, X`Governed contract can only be created once`);
    registrar = E(registrarCreatorFacet).getPublicFacet();

    const augmentedTerms = {
      ...customTerms,
      electionManager: zcf.getInstance(),
    };

    const { creatorFacet, instance, publicFacet } = await E(zoe).startInstance(
      governedContractInstallation,
      issuerKeywordRecord,
      augmentedTerms,
    );
    governedInstance = instance;

    const paramManagerAccessor = E(creatorFacet).getParamMgrAccessor();

    const { voteOnParamChange } = await setupGovernance(
      paramManagerAccessor,
      registrarCreatorFacet,
      governedInstance,
    );

    return Far('governedContract', {
      voteOnParamChange,
      getCreatorFacet: () => creatorFacet,
      getInstance: () => governedInstance,
      getPublicFacet: () => publicFacet,
    });
  };

  const creatorFacet = Far('governor creatorFacet', {
    startGovernedInstance,
  });

  const publicFacet = Far('contract governor public', {
    getRegistrar: () => registrar,
    getGovernedContract: () => governedInstance,
  });

  return { creatorFacet, publicFacet };
};
harden(start);
export { start };
