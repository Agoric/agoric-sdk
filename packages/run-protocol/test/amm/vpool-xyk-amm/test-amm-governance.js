// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { E } from '@agoric/eventual-send';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { CONTRACT_ELECTORATE } from '@agoric/governance';

import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import {
  POOL_FEE_KEY,
  PROTOCOL_FEE_KEY,
} from '../../../src/vpool-xyk-amm/params.js';
import { amountGT } from '../../../src/vpool-xyk-amm/constantProduct/calcFees.js';
import { startEconomicCommittee } from '../../../src/econ-behaviors.js';

import { setupAmmServices, setupAMMBootstrap } from './setup.js';

test('start Economic Committee', async t => {
  const { produce, consume } = await setupAMMBootstrap();
  startEconomicCommittee({ produce, consume });
  const agoricNames = await consume.agoricNames;
  const instance = await E(agoricNames).lookup('instance', 'economicCommittee');
  t.truthy(instance);
  const creator = await consume.economicCommitteeCreatorFacet;
  t.truthy(creator);
});

test('amm change param via Governance', async t => {
  const centralR = makeIssuerKit('central');
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { zoe, amm, committeeCreator, governor, installs, invitationAmount } =
    await setupAmmServices(electorateTerms, centralR, timer);

  t.deepEqual(
    await E(amm.ammPublicFacet).getGovernedParams(),
    {
      [POOL_FEE_KEY]: {
        type: 'nat',
        value: 24n,
      },
      [PROTOCOL_FEE_KEY]: {
        type: 'nat',
        value: 6n,
      },
      [CONTRACT_ELECTORATE]: {
        type: 'invitation',
        value: invitationAmount,
      },
    },
    'initial values',
  );

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;
  const { details } = await E(governorCreatorFacet).voteOnParamChange(
    { key: 'main', parameterName: PROTOCOL_FEE_KEY },
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

  const paramValue = await E(amm.ammPublicFacet).getNat(PROTOCOL_FEE_KEY);
  t.deepEqual(paramValue, 20n, 'updated value');
});

test('price check after Governance param change', async t => {
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaR = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaR.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(console.log);

  const { zoe, amm, committeeCreator, governor, installs, invitationAmount } =
    await setupAmmServices(electorateTerms, centralR, timer);

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
        type: 'nat',
        value: 24n,
      },
      ProtocolFee: {
        type: 'nat',
        value: 6n,
      },
      Electorate: {
        type: 'invitation',
        value: invitationAmount,
      },
    },
    'initial values',
  );

  const invitations = await E(committeeCreator).getVoterInvitations();
  const { governorCreatorFacet } = governor;
  const { details } = await E(governorCreatorFacet).voteOnParamChange(
    { key: 'main', parameterName: PROTOCOL_FEE_KEY },
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

  const paramValue = await E(amm.ammPublicFacet).getNat(PROTOCOL_FEE_KEY);
  t.deepEqual(paramValue, 20n, 'updated value');

  const priceAfter = await E(amm.ammPublicFacet).getInputPrice(
    moola(17000n),
    AmountMath.makeEmpty(centralR.brand),
  );

  t.truthy(amountGT(priceInCentrals.amountOut, priceAfter.amountOut));
  t.truthy(AmountMath.isEqual(priceAfter.amountIn, priceInCentrals.amountIn));
});
