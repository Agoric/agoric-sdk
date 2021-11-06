// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@agoric/bundle-source';
import { E } from '@agoric/eventual-send';
import { makeLoopback } from '@agoric/captp';

import { resolve as importMetaResolve } from 'import-meta-resolve';
import { ParamType } from '@agoric/governance';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeFakeVatAdmin } from '../../../../tools/fakeVatAdmin.js';

// noinspection ES6PreferShortImport
import { makeZoeKit } from '../../../../src/zoeService/zoe.js';
import buildManualTimer from '../../../../tools/manualTimer.js';
import {
  POOL_FEE_KEY,
  PROTOCOL_FEE_KEY,
} from '../../../../src/contracts/vpool-xyk-amm/params.js';
import { amountGT } from '../../../../src/contracts/constantProduct/calcFees.js';

const ammRoot =
  '@agoric/zoe/src/contracts/vpool-xyk-amm/multipoolMarketMaker.js';
const contractGovernorRoot = '@agoric/governance/src/contractGovernor.js';
const committeeRoot = '@agoric/governance/src/committee.js';
const voteCounterRoot = '@agoric/governance/src/binaryVoteCounter.js';

const POOL_FEE_BP = 24n;
const PROTOCOL_FEE_BP = 6n;

const makeBundle = async sourceRoot => {
  const url = await importMetaResolve(sourceRoot, import.meta.url);
  const path = new URL(url).pathname;
  const contractBundle = await bundleSource(path);
  console.log(`makeBundle ${sourceRoot}`);
  return contractBundle;
};

const setUpZoeForTest = async () => {
  const { makeFar, makeNear } = makeLoopback('zoeTest');
  let isFirst = true;
  const makeRemote = arg => {
    const result = isFirst ? makeNear(arg) : arg;
    // this seems fragile. It relies on one contract being created first by Zoe
    isFirst = false;
    return result;
  };

  const {
    zoeService: nonFarZoeService,
    feeMintAccess: nonFarFeeMintAccess,
  } = makeZoeKit(makeFakeVatAdmin(() => {}, makeRemote).admin);
  const feePurse = E(nonFarZoeService).makeFeePurse();

  const zoeService = await E(nonFarZoeService).bindDefaultFeePurse(feePurse);
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};

const installBundle = (zoe, contractBundle) => E(zoe).install(contractBundle);

// makeBundle is a slow step, so we do it once for all the tests.
const autoswapBundleP = makeBundle(ammRoot);
const contractGovernorBundleP = makeBundle(contractGovernorRoot);
const committeeBundleP = makeBundle(committeeRoot);
const voteCounterBundleP = makeBundle(voteCounterRoot);

// called separately by each test so AMM/zoe/priceAuthority don't interfere
const setupServices = async (
  electorateTerms,
  ammTerms,
  centralR,
  timer = buildManualTimer(console.log),
) => {
  const { zoe } = await setUpZoeForTest();

  const [
    autoswapBundle,
    contractGovernorBundle,
    committeeBundle,
    voteCounterBundle,
  ] = await Promise.all([
    autoswapBundleP,
    contractGovernorBundleP,
    committeeBundleP,
    voteCounterBundleP,
  ]);

  const [autoswap, governor, electorate, counter] = await Promise.all([
    installBundle(zoe, autoswapBundle),
    installBundle(zoe, contractGovernorBundle),
    installBundle(zoe, committeeBundle),
    installBundle(zoe, voteCounterBundle),
  ]);
  const installs = {
    autoswap,
    governor,
    electorate,
    counter,
  };

  const {
    creatorFacet: committeeCreator,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installs.electorate, {}, electorateTerms);

  const governorTerms = {
    timer,
    electorateInstance,
    governedContractInstallation: installs.autoswap,
    governed: {
      terms: ammTerms,
      issuerKeywordRecord: { Central: centralR.issuer },
    },
  };

  const {
    instance: governorInstance,
    publicFacet: governorPublicFacet,
    creatorFacet: governorCreatorFacet,
  } = await E(zoe).startInstance(installs.governor, {}, governorTerms, {
    electorateCreatorFacet: committeeCreator,
  });

  const ammCreatorFacetP = E(governorCreatorFacet).getInternalCreatorFacet();
  const ammPublicP = E(governorCreatorFacet).getPublicFacet();

  const [ammCreatorFacet, ammPublicFacet] = await Promise.all([
    ammCreatorFacetP,
    ammPublicP,
  ]);

  const g = { governorInstance, governorPublicFacet, governorCreatorFacet };
  const governedInstance = E(governorPublicFacet).getGovernedContract();

  const amm = { ammCreatorFacet, ammPublicFacet, instance: governedInstance };

  return {
    zoe,
    installs,
    governor: g,
    amm,
    committeeCreator,
  };
};

const ammInitialValues = harden([
  {
    name: POOL_FEE_KEY,
    value: 24n,
    type: ParamType.NAT,
  },
  {
    name: PROTOCOL_FEE_KEY,
    value: 6n,
    type: ParamType.NAT,
  },
]);

test('amm change param via Governance', async t => {
  const centralR = makeIssuerKit('central');
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const ammTerms = {
    timer,
    poolFeeBP: POOL_FEE_BP,
    protocolFeeBP: PROTOCOL_FEE_BP,
    main: ammInitialValues,
  };

  const {
    zoe,
    amm,
    committeeCreator,
    governor,
    installs,
  } = await setupServices(electorateTerms, ammTerms, centralR, timer);

  t.deepEqual(
    await E(amm.ammPublicFacet).getGovernedParams(),
    {
      PoolFee: {
        name: POOL_FEE_KEY,
        type: 'nat',
        value: 24n,
      },
      ProtocolFee: {
        name: PROTOCOL_FEE_KEY,
        type: 'nat',
        value: 6n,
      },
    },
    'initial values',
  );

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;
  const { details } = await E(governorCreatorFacet).voteOnParamChange(
    { parameterName: PROTOCOL_FEE_KEY },
    20n,
    installs.counter,
    2n,
  );
  const { positions, questionHandle } = await details;

  const exerciseAndVote = invitation => {
    const seat = E(zoe).offer(invitation);
    const voteFacet = E(seat).getOfferResult();
    return E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  const paramValue = await E(amm.ammPublicFacet).getParamValue(
    PROTOCOL_FEE_KEY,
  );
  t.deepEqual(paramValue, 20n, 'updated value');
});

test('price check after Governance param change', async t => {
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const ammTerms = {
    timer,
    poolFeeBP: POOL_FEE_BP,
    protocolFeeBP: PROTOCOL_FEE_BP,
    main: ammInitialValues,
  };

  const {
    zoe,
    amm,
    committeeCreator,
    governor,
    installs,
  } = await setupServices(electorateTerms, ammTerms, centralR, timer);

  // Setup Alice
  const aliceMoolaPayment = moolaR.mint.mintPayment(moola(100000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000n));

  const aliceAddLiquidityInvitation = E(
    amm.ammPublicFacet,
  ).makeAddLiquidityInvitation();

  const moolaLiquidityIssuer = await E(amm.ammPublicFacet).addPool(
    moolaR.issuer,
    'Moola',
  );
  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(50000n) },
    give: { Secondary: moola(100000n), Central: centralTokens(50000n) },
  });
  const alicePayments = {
    Secondary: aliceMoolaPayment,
    Central: aliceCentralPayment,
  };

  const addLiquiditySeat = await E(zoe).offer(
    aliceAddLiquidityInvitation,
    aliceProposal,
    alicePayments,
  );

  t.is(
    await E(addLiquiditySeat).getOfferResult(),
    'Added liquidity.',
    `Alice added moola and central liquidity`,
  );

  // look up the price of 17000 moola in central tokens
  const priceInCentrals = await E(amm.ammPublicFacet).getInputPrice(
    moola(17000n),
    AmountMath.makeEmpty(centralR.brand),
  );

  t.deepEqual(
    await E(amm.ammPublicFacet).getGovernedParams(),
    {
      PoolFee: {
        name: POOL_FEE_KEY,
        type: 'nat',
        value: 24n,
      },
      ProtocolFee: {
        name: PROTOCOL_FEE_KEY,
        type: 'nat',
        value: 6n,
      },
    },
    'initial values',
  );

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;
  const { details } = await E(governorCreatorFacet).voteOnParamChange(
    { parameterName: PROTOCOL_FEE_KEY },
    20n,
    installs.counter,
    2n,
  );
  const { positions, questionHandle } = await details;

  const exerciseAndVote = invitation => {
    const seat = E(zoe).offer(invitation);
    const voteFacet = E(seat).getOfferResult();
    return E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
  };
  await Promise.all(invitations.map(exerciseAndVote));

  await timer.tick();
  await timer.tick();
  await timer.tick();

  const paramValue = await E(amm.ammPublicFacet).getParamValue(
    PROTOCOL_FEE_KEY,
  );
  t.deepEqual(paramValue, 20n, 'updated value');

  const priceAfter = await E(amm.ammPublicFacet).getInputPrice(
    moola(17000n),
    AmountMath.makeEmpty(centralR.brand),
  );

  t.truthy(amountGT(priceInCentrals.amountOut, priceAfter.amountOut));
  t.truthy(AmountMath.isEqual(priceAfter.amountIn, priceInCentrals.amountIn));
});
