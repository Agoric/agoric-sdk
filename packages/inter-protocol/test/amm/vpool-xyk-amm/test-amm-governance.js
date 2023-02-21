// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { CONTRACT_ELECTORATE } from '@agoric/governance';
import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { eventLoopIteration } from '@agoric/zoe/tools/eventLoopIteration.js';
import { E } from '@endo/eventual-send';
import { startEconomicCommittee } from '../../../src/proposals/startEconCommittee.js';
import { amountGT } from '../../../src/vpool-xyk-amm/constantProduct/calcFees.js';
import {
  MIN_INITIAL_POOL_LIQUIDITY_KEY,
  POOL_FEE_KEY,
  PROTOCOL_FEE_KEY,
} from '../../../src/vpool-xyk-amm/params.js';
import { setupAMMBootstrap, setupAmmServices } from './setup.js';

test.before(async t => {
  const bundleCache = await unsafeMakeBundleCache('bundles/');
  t.context = { bundleCache };
});

test('start Economic Committee', async t => {
  const space = await setupAMMBootstrap();
  const { consume } = space;
  await startEconomicCommittee(space, {
    options: {
      econCommitteeOptions: {
        committeeName: 'The Cabal',
        committeeSize: 1,
      },
    },
  });
  const agoricNames = await consume.agoricNames;
  const instance = await E(agoricNames).lookup('instance', 'economicCommittee');
  t.truthy(instance);
  const creator = await consume.economicCommitteeCreatorFacet;
  t.truthy(creator);
});

test('amm change param via Governance', async t => {
  const centralR = makeIssuerKit('central');
  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });

  const { amm, governor, invitationAmount } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  t.deepEqual(
    await E(amm.ammPublicFacet).getGovernedParams(),
    {
      [POOL_FEE_KEY]: {
        type: 'nat',
        value: 24n,
      },
      [MIN_INITIAL_POOL_LIQUIDITY_KEY]: {
        type: 'amount',
        value: AmountMath.make(centralR.brand, 1000n),
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

  const { governorCreatorFacet } = governor;
  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: { [PROTOCOL_FEE_KEY]: 20n },
  });

  await E(governorCreatorFacet).changeParams(paramChangeSpec);

  const protocolFee = await E(amm.ammPublicFacet).getProtocolFee();
  t.deepEqual(protocolFee, 20n, 'updated value');
});

test('price check after Governance param change', async t => {
  const centralR = makeIssuerKit('central');
  const centralTokens = value => AmountMath.make(centralR.brand, value);
  const moolaKit = makeIssuerKit('moola');
  const moola = value => AmountMath.make(moolaKit.brand, value);

  const electorateTerms = { committeeName: 'EnBancPanel', committeeSize: 3 };
  const timer = buildManualTimer(t.log, 0n, { eventLoopIteration });

  const { zoe, amm, governor, invitationAmount } = await setupAmmServices(
    t,
    electorateTerms,
    centralR,
    timer,
  );

  // Setup Alice
  const aliceMoolaPayment = moolaKit.mint.mintPayment(moola(100000n));
  // Let's assume that central tokens are worth 2x as much as moola
  const aliceCentralPayment = centralR.mint.mintPayment(centralTokens(50000n));

  const moolaLiquidityIssuer = await E(amm.ammPublicFacet).addIssuer(
    moolaKit.issuer,
    'Moola',
  );
  const aliceAddLiquidityInvitation = E(amm.ammPublicFacet).addPoolInvitation();

  const moolaLiquidityBrand = await E(moolaLiquidityIssuer).getBrand();
  const moolaLiquidity = value => AmountMath.make(moolaLiquidityBrand, value);

  const aliceProposal = harden({
    want: { Liquidity: moolaLiquidity(40000n) },
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
      MinInitialPoolLiquidity: {
        type: 'amount',
        value: AmountMath.make(centralR.brand, 1000n),
      },
      Electorate: {
        type: 'invitation',
        value: invitationAmount,
      },
    },
    'initial values',
  );

  const { governorCreatorFacet } = governor;
  const paramChangeSpec = harden({
    paramPath: { key: 'governedParams' },
    changes: {
      [PROTOCOL_FEE_KEY]: 20n,
    },
  });
  await E(governorCreatorFacet).changeParams(paramChangeSpec);

  const paramValue = await E(amm.ammPublicFacet).getNat(PROTOCOL_FEE_KEY);
  t.deepEqual(paramValue, 20n, 'updated value');

  const priceAfter = await E(amm.ammPublicFacet).getInputPrice(
    moola(17000n),
    AmountMath.makeEmpty(centralR.brand),
  );

  t.truthy(amountGT(priceInCentrals.amountOut, priceAfter.amountOut));
  t.truthy(AmountMath.isEqual(priceAfter.amountIn, priceInCentrals.amountIn));
});
