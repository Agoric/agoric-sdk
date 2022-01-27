// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { INTEREST_RATE_KEY } from '../../../../src/vaultFactory/params';
import { ONE_DAY, createCommittee, installContracts, makeVats } from '../setup';

const BASIS_POINTS = 10000n;

export const daysForVoting = 3;

const votersVote = async (detailsP, votersP, selections) => {
  const [voters, { positions, questionHandle }] = await Promise.all([
    votersP,
    detailsP,
  ]);

  await Promise.all(
    voters.map((v, i) => {
      return E(v).castBallotFor(questionHandle, positions[selections[i]]);
    }),
  );
};

const oneVoterValidate = async (
  votersP,
  details,
  governedInstanceP,
  electorateInstance,
  governorInstanceP,
  installations,
) => {
  const [voters, governedInstance, governorInstance] = await Promise.all([
    votersP,
    governedInstanceP,
    governorInstanceP,
  ]);
  const { counterInstance, issue } = await details;

  E(voters[0]).validate(
    counterInstance,
    governedInstance,
    electorateInstance,
    governorInstance,
    issue,
    installations,
  );
};

const setUpVote = async (
  newValue,
  deadline,
  votersP,
  votes,
  paramDesc,
  contracts,
) => {
  const {
    vaultFactory,
    installations,
    electorateInstance,
    governor,
  } = contracts;

  const { details: feeDetails } = await E(
    vaultFactory.voteCreator,
  ).voteOnParamChange(paramDesc, newValue, installations.counter, deadline);
  await votersVote(feeDetails, votersP, votes);

  await oneVoterValidate(
    votersP,
    feeDetails,
    vaultFactory.instance,
    electorateInstance,
    governor.instance,
    installations,
  );
  return E.get(feeDetails).counterInstance;
};

const makeBootstrap = (argv, cb, vatPowers) => async (vats, devices) => {
  const log = vatPowers.testLog;
  const vatAdminSvc = await E(vats.vatAdmin).createVatAdminService(
    devices.vatAdmin,
  );
  const { zoe, feeMintAccess } = await E(vats.zoe).buildZoe(vatAdminSvc);

  const installations = await installContracts(zoe, cb);
  const voterCreator = E(vats.voter).build(zoe);

  const [testName, startingValues] = argv;

  const {
    aliceP,
    governor,
    vaultFactory,
    runBrand,
    electorateCreatorFacet,
    electorateInstance,
    brands: [collateralBrand],
  } = await makeVats(
    log,
    vats,
    zoe,
    installations,
    startingValues,
    feeMintAccess,
  );

  const votersP = createCommittee(electorateCreatorFacet, voterCreator);
  log(`=> voter and electorate vats are set up`);

  const feeParamsStateAnte = await E(
    vaultFactory.publicFacet,
  ).getGovernedParams({
    collateralBrand,
  });
  log(
    `before vote, InterestRate numerator is ${feeParamsStateAnte.InterestRate.value.numerator.value}`,
  );

  const contracts = {
    vaultFactory,
    installations,
    electorateInstance,
    governor,
  };
  const votes = [0, 1, 1, 0, 0];

  const interestRateParam = {
    parameterName: INTEREST_RATE_KEY,
    collateralBrand,
  };
  const counter = await setUpVote(
    makeRatio(4321n, runBrand, BASIS_POINTS),
    BigInt(daysForVoting) * ONE_DAY,
    votersP,
    votes,
    interestRateParam,
    contracts,
  );

  E(E(zoe).getPublicFacet(counter))
    .getOutcome()
    .then(async outcome => {
      const feeParamsStatePost = await E(
        vaultFactory.publicFacet,
      ).getGovernedParams(interestRateParam);
      log(
        `after vote on (${outcome.changeParam.parameterName}), InterestRate numerator is ${feeParamsStatePost.InterestRate.value.numerator.value}`,
      );
    })
    .catch(e => log(`BOOT fail: ${e}`));

  await E(aliceP).startTest(testName, vaultFactory.publicFacet);
};

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
