// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { INTEREST_RATE_KEY } from '../../../src/params';
import { ONE_DAY, createCommittee, installContracts, makeVats } from '../setup';

const { quote: q } = assert;
const BASIS_POINTS = 10000n;

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
  const { treasury, installations, electorateInstance, governor } = contracts;

  const { details: feeDetails } = await E(
    treasury.voteCreator,
  ).voteOnParamChange(paramDesc, newValue, installations.counter, deadline);
  await votersVote(feeDetails, votersP, votes);

  await oneVoterValidate(
    votersP,
    feeDetails,
    treasury.instance,
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
    treasury,
    runBrand,
    timer,
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

  const feeParamsStateAnte = await E(treasury.publicFacet).getGovernedParams({
    collateralBrand,
  });
  log(`param values before ${q(feeParamsStateAnte)}`);

  const contracts = { treasury, installations, electorateInstance, governor };
  const votes = [0, 1, 1, 0, 0];

  const interestRateParam = {
    parameterName: INTEREST_RATE_KEY,
    collateralBrand,
  };
  const counter = await setUpVote(
    makeRatio(500n, runBrand, BASIS_POINTS),
    3n * ONE_DAY,
    votersP,
    votes,
    interestRateParam,
    contracts,
  );

  E(E(zoe).getPublicFacet(counter))
    .getOutcome()
    .then(async outcome => {
      const feeParamsStatePost = await E(
        treasury.publicFacet,
      ).getGovernedParams(interestRateParam);
      log(
        `param values after vote on (${outcome.changeParam.parameterName}) ${q(
          feeParamsStatePost,
        )}`,
      );
    })
    .catch(e => log(`BOOT fail: ${e}`));

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  await E(aliceP).startTest(testName, treasury.publicFacet);
};

export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
