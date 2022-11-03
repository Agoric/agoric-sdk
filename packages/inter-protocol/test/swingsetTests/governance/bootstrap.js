import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';

import { INTEREST_RATE_KEY } from '../../../src/vaultFactory/params';
import { createCommittee, installContracts, makeVats, ONE_DAY } from '../setup';

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

/**
 *
 * @param {ERef<import('./vat-voter.js').EVatVoter[]>} votersP
 * @param {ERef<QuestionSpec<ParamChangeIssue> & QuestionDetailsExtraProperties>} detailsP
 * @param {Instance} governedInstanceP
 * @param {Instance} electorateInstance
 * @param {Instance} governorInstanceP
 * @param {Record<string, Installation>} installations
 * @param {string} parameterName
 * @returns {Promise<void>}
 */
const oneVoterValidate = async (
  votersP,
  detailsP,
  governedInstanceP,
  electorateInstance,
  governorInstanceP,
  installations,
  parameterName,
) => {
  /** @type {[import('./vat-voter').EVatVoter[], Instance, Instance]} */
  const [voters, governedInstance, governorInstance] = await Promise.all([
    votersP,
    governedInstanceP,
    governorInstanceP,
  ]);
  const { counterInstance, issue } = await detailsP;

  return E(voters[0]).validate(
    counterInstance,
    governedInstance,
    electorateInstance,
    governorInstance,
    harden({ paramPath: issue.spec.paramPath, parameterName }),
    installations,
  );
};

const setUpVote = async (deadline, votersP, votes, contracts, paramChanges) => {
  const { vaultFactory, installations, electorateInstance, governor } =
    contracts;

  const { details: feeDetails } = await E(
    governor.creatorFacet,
  ).voteOnParamChanges(installations.counter, deadline, paramChanges);
  await votersVote(feeDetails, votersP, votes);

  await oneVoterValidate(
    votersP,
    feeDetails,
    vaultFactory.instance,
    electorateInstance,
    governor.instance,
    installations,
    Object.keys(paramChanges.changes)[0],
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

  const paramChanges = harden({
    paramPath: { key: { collateralBrand } },
    changes: {
      [INTEREST_RATE_KEY]: makeRatio(4321n, runBrand, BASIS_POINTS),
    },
  });

  const counter = await setUpVote(
    BigInt(daysForVoting) * ONE_DAY,
    votersP,
    votes,
    contracts,
    paramChanges,
  );

  const interestRateParam = {
    parameterName: INTEREST_RATE_KEY,
    collateralBrand,
  };
  E(E(zoe).getPublicFacet(counter))
    .getOutcome()
    .then(async () => {
      const feeParamsStatePost = await E(
        vaultFactory.publicFacet,
      ).getGovernedParams(interestRateParam);
      log(
        `after vote on (${
          Object.keys(paramChanges.changes)[0]
        }), InterestRate numerator is ${
          feeParamsStatePost.InterestRate.value.numerator.value
        }`,
      );
    })
    .catch(e => log(`BOOT fail: ${e}`));

  await E(aliceP).startTest(testName, vaultFactory.publicFacet);
};

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject(vatPowers, vatParameters) {
  const { argv, contractBundles: cb } = vatParameters;
  return Far('root', { bootstrap: makeBootstrap(argv, cb, vatPowers) });
}
