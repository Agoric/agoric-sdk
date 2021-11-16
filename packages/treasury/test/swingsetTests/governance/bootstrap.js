// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import buildManualTimer from '@agoric/zoe/tools/manualTimer';
import { q } from '@agoric/assert';
import { makeRatio } from '@agoric/zoe/src/contractSupport';

import { POOL_FEE_KEY, ParamKey, INTEREST_RATE_KEY } from '../../../src/params';

const ONE_DAY = 24n * 60n * 60n;
const BASIS_POINTS = 10000n;

const setupBasicMints = () => {
  const all = [makeIssuerKit('moola')];
  const mints = all.map(objs => objs.mint);
  const issuers = all.map(objs => objs.issuer);
  const brands = all.map(objs => objs.brand);

  return harden({
    mints,
    issuers,
    brands,
  });
};

const installContracts = async (zoe, cb) => {
  const [
    liquidateMinimum,
    autoswap,
    treasury,
    electorate,
    counter,
    governor,
  ] = await Promise.all([
    E(zoe).install(cb.liquidateMinimum),
    E(zoe).install(cb.autoswap),
    E(zoe).install(cb.treasury),
    E(zoe).install(cb.committee),
    E(zoe).install(cb.binaryVoteCounter),
    E(zoe).install(cb.contractGovernor),
  ]);

  const installations = {
    liquidateMinimum,
    autoswap,
    treasury,
    electorate,
    counter,
    governor,
  };
  return installations;
};

const startElectorate = async (zoe, installations) => {
  const electorateTerms = harden({
    committeeName: 'TwentyCommittee',
    committeeSize: 5,
  });
  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(
    installations.electorate,
    harden({}),
    electorateTerms,
  );
  return { electorateCreatorFacet, electorateInstance };
};

const createCommittee = async (electorateCreatorFacet, voterCreator) => {
  const invitations = await E(electorateCreatorFacet).getVoterInvitations();

  const floraP = E(voterCreator).createVoter('Flora', invitations[0]);
  const bobP = E(voterCreator).createVoter('Bob', invitations[1]);
  const carolP = E(voterCreator).createVoter('Carol', invitations[2]);
  const daveP = E(voterCreator).createVoter('Dave', invitations[3]);
  const emmaP = E(voterCreator).createVoter('Emma', invitations[4]);
  return Promise.all([bobP, carolP, daveP, emmaP, floraP]);
};

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
  const timer = buildManualTimer(console.log, 0n, ONE_DAY);
  const { mints, issuers, brands } = setupBasicMints();
  const makePayments = values =>
    mints.map((mint, i) =>
      mint.mintPayment(AmountMath.make(brands[i], BigInt(values[i]))),
    );
  const [aliceValues, ownerValues] = startingValues;

  const { electorateCreatorFacet, electorateInstance } = await startElectorate(
    zoe,
    installations,
  );

  const votersP = createCommittee(electorateCreatorFacet, voterCreator);
  log(`=> voter and electorate vats are set up`);

  // Setup Alice
  const aliceP = E(vats.alice).build(
    zoe,
    brands,
    makePayments(aliceValues),
    timer,
  );

  // Setup Owner
  const { governor, governed: treasury, runBrand } = await E(vats.owner).build(
    zoe,
    issuers,
    brands,
    makePayments(ownerValues),
    installations,
    timer,
    vats.priceAuthority,
    feeMintAccess,
    electorateInstance,
    electorateCreatorFacet,
  );
  log(`=> alice and the treasury are set up`);

  const feeParamsStateAnte = await E(treasury.publicFacet).getParams({
    key: ParamKey.FEE,
  });
  log(`param values before ${q(feeParamsStateAnte)}`);

  const contracts = { treasury, installations, electorateInstance, governor };
  const votes = [0, 1, 1, 0, 0];

  const fees = {
    key: ParamKey.FEE,
    parameterName: POOL_FEE_KEY,
  };

  const counter = await setUpVote(
    37n,
    3n * ONE_DAY,
    votersP,
    votes,
    fees,
    contracts,
  );

  const poolParams = {
    key: ParamKey.POOL,
    parameterName: INTEREST_RATE_KEY,
    collateralBrand: brands[0],
  };
  const newRate = makeRatio(500n, runBrand, BASIS_POINTS);

  await setUpVote(newRate, 3n * ONE_DAY, votersP, votes, poolParams, contracts);

  E(E(zoe).getPublicFacet(counter))
    .getOutcome()
    .then(async outcome => {
      const feeParamsStatePost = await E(treasury.publicFacet).getParams({
        key: ParamKey.FEE,
      });
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
