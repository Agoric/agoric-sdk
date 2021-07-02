// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { q } from '@agoric/assert';
import { governedParameterTerms } from './governedContract';

/**
 * @param {ERef<ZoeService>} zoe
 * @param {(string:string) => undefined} log
 * @param {Record<string,Installation>} installations
 * @param {GovernedContract} voteCreator
 * @returns {Promise<*>}
 */
const contractGovernorStart = async (zoe, log, installations, voteCreator) => {
  const { details, instance, outcomeOfUpdate } = await E(
    voteCreator,
  ).voteOnParamChange(
    { key: 'contractParams', parameterName: 'MalleableNumber' },
    299792458n,
    installations.binaryBallotCounter,
    3n,
  );

  E(E(zoe).getPublicFacet(instance))
    .getOutcome()
    .then(outcome => log(`vote outcome: ${q(outcome)}`))
    .catch(e => log(`vote failed ${e}`));

  E.when(outcomeOfUpdate, outcome => log(`updated to ${q(outcome)}`)).catch(e =>
    log(`update failed: ${e}`),
  );
  return details;
};

const installContracts = async (zoe, cb) => {
  const [
    committeeRegistrar,
    binaryBallotCounter,
    contractGovernor,
    governedContract,
  ] = await Promise.all([
    E(zoe).install(cb.committeeRegistrar),
    E(zoe).install(cb.binaryBallotCounter),
    E(zoe).install(cb.contractGovernor),
    E(zoe).install(cb.governedContract),
  ]);
  const installations = {
    committeeRegistrar,
    binaryBallotCounter,
    contractGovernor,

    governedContract,
  };
  return installations;
};

const startRegistrar = async (zoe, installations) => {
  const registrarTerms = { committeeName: 'TwentyCommittee', committeeSize: 5 };
  const {
    creatorFacet: committeeCreator,
    instance: registrarInstance,
  } = await E(zoe).startInstance(
    installations.committeeRegistrar,
    {},
    registrarTerms,
  );
  return { committeeCreator, registrarInstance };
};

const createCommittee = async (committeeCreator, voterCreator) => {
  const invitations = await E(committeeCreator).getVoterInvitations();

  const aliceP = E(voterCreator).createVoter('Alice', invitations[0]);
  const bobP = E(voterCreator).createVoter('Bob', invitations[1]);
  const carolP = E(voterCreator).createVoter('Carol', invitations[2]);
  const daveP = E(voterCreator).createVoter('Dave', invitations[3]);
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4]);
  return Promise.all([aliceP, bobP, carolP, daveP, emmaP]);
};

const votersVote = async (detailsP, votersP, selections) => {
  const [voters, details] = await Promise.all([votersP, detailsP]);
  const { positions, handle } = details;

  await Promise.all(
    voters.map((v, i) => {
      return E(v).castBallotFor(handle, positions[selections[i]]);
    }),
  );
};

const oneVoterValidate = async (
  votersP,
  detailsP,
  governedInstanceP,
  registrarInstance,
  governorInstanceP,
) => {
  const [
    voters,
    details,
    governedInstance,
    governorInstance,
  ] = await Promise.all([
    votersP,
    detailsP,
    governedInstanceP,
    governorInstanceP,
  ]);
  const { counterInstance } = details;

  E(voters[0]).validate(
    counterInstance,
    governedInstance,
    registrarInstance,
    governorInstance,
  );
};

const checkContractState = async (zoe, timer, contractInstanceP, log) => {
  const contractInstance = await contractInstanceP;
  const contractPublic = E(zoe).getPublicFacet(contractInstance);
  let state = await E(contractPublic).getState();

  // it takes a while for the update to propagate. The second time it seems good
  state = await E(contractPublic).getState();
  const malleableNumber = state.MalleableNumber;
  log(`current value of ${malleableNumber.name} is ${malleableNumber.value}`);
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  const zoe = E(vats.zoe).buildZoe(vatAdminSvc);
  const installations = await installContracts(zoe, cb);
  const timer = buildManualTimer(log);
  const voterCreator = E(vats.voter).build(zoe);
  const { committeeCreator, registrarInstance } = await startRegistrar(
    zoe,
    installations,
  );

  log(`=> voter and registrar vats are set up`);

  const { creatorFacet: governor, instance: governorInstance } = await E(
    zoe,
  ).startInstance(installations.contractGovernor, {}, { timer });
  const governedContract = await E(governor).startGovernedInstance(
    committeeCreator,
    installations.governedContract,
    {},
    { governedParams: governedParameterTerms },
  );
  const governedInstance = E(governedContract).getInstance();

  const [testName] = argv;
  switch (testName) {
    case 'contractGovernorStart': {
      const votersP = createCommittee(committeeCreator, voterCreator);
      const detailsP = contractGovernorStart(
        zoe,
        log,
        installations,
        governedContract,
      );
      await votersVote(detailsP, votersP, [0, 1, 1, 0, 0]);
      await oneVoterValidate(
        votersP,
        detailsP,
        governedInstance,
        registrarInstance,
        governorInstance,
      );

      await E(timer).tick();
      await E(timer).tick();
      await E(timer).tick();

      await checkContractState(zoe, timer, governedInstance, log);
      break;
    }
    default:
      log(`didn't find test: ${argv}`);
  }
};

export const buildRootObject = (vatPowers, vatParameters) => {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
};
