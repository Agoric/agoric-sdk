// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { resolve as metaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@endo/far';
import { Far, makeLoopback } from '@endo/captp';
import bundleSource from '@endo/bundle-source';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';

import { makeCopyBag } from '@agoric/store';
import {
  makeAgoricNamesAccess,
  makePromiseSpace,
} from '@agoric/vats/src/core/utils.js';
import {
  startEconomicCommittee,
  startRunStake,
} from '../../src/econ-behaviors.js';
import {
  governanceBundles,
  economyBundles,
} from '../../src/importedBundles.js';
import * as Collect from '../../src/collect.js';
import { KW } from '../../src/runStake/runStake.js';

// 8	Partial repayment from reward stream - TODO
// TODO: #4728 case 9: Extending LoC - unbonded (FAIL)

// skipping:
// 10	Partial repay - insufficient funds (FAIL) - Zoe prevents this
// 12	Add collateral - lots of test harness for little gain
// 13	Add collateral - CR increase ok
import { CASES as TestData } from './runStake-test-steps.js';

const contractRoots = {
  runStake: '../../src/runStake/runStake.js',
  faker: './attestationFaker.js',
};

const { assign, entries } = Object;
const { details: X } = assert;

const SECONDS_PER_HOUR = 60n * 60n;
const SECONDS_PER_DAY = 24n * SECONDS_PER_HOUR;

test.before(async t => {
  /** @param { string } ref */
  const asset = async ref =>
    new URL(await metaResolve(ref, import.meta.url)).pathname;

  t.log('bundling...', contractRoots);
  const bundles = await Collect.allValues(
    Collect.mapValues(contractRoots, spec => asset(spec).then(bundleSource)),
  );
  t.log(
    'bundled:',
    Collect.mapValues(bundles, b => b.endoZipBase64.length),
  );
  assign(t.context, { bundles });
});

/**
 * @param {{ context: unknown }} t
 * @returns { Record<string, Bundle> }
 */
const theBundles = t => /** @type { any } */ (t.context).bundles;

export const setUpZoeForTest = async () => {
  const { makeFar } = makeLoopback('zoeTest');

  const { zoeService, feeMintAccess: nonFarFeeMintAccess } = makeZoeKit(
    makeFakeVatAdmin(() => {}).admin,
  );
  /** @type {ERef<ZoeService>} */
  const zoe = makeFar(zoeService);
  const feeMintAccess = await makeFar(nonFarFeeMintAccess);
  return {
    zoe,
    feeMintAccess,
  };
};
harden(setUpZoeForTest);

export const setupBootstrap = async (
  bundles,
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } =
    /** @type { import('../../src/econ-behaviors.js').RunStakeBootstrapPowers } */ (
      space
    );

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  produce.governanceBundles.resolve(governanceBundles);
  produce.centralSupplyBundle.resolve(economyBundles.centralSupply);

  return { produce, consume, ...spaces };
};

const mockChain = genesisData => {
  let currentTime = 50n;

  /** @type {Map<string, bigint>} */
  const bankBalance = new Map();
  /** @type {Map<string, bigint>} */
  const liened = new Map();
  /** @type {Map<string, bigint>} */
  const bonded = new Map();
  /** @type {(addr: string, map: Map<string, bigint>) => bigint} */
  const qty = (addr, map) => map.get(addr) || 0n;

  const max = (x, y) => (x > y ? x : y);

  const it = Far('simulator', {
    send: (src, dest, n) => {
      assert.typeof(dest, 'string');
      assert.typeof(n, 'bigint');
      const b = (bankBalance.get(src) || 0n) - n;
      assert(b >= 0n);
      bankBalance.set(src, b);
      bankBalance.set(dest, (bankBalance.get(dest) || 0n) + n);
    },
    stake: (addr, ustake) => {
      bonded.set(addr, (bonded.get(addr) || 0n) + ustake);
    },
    slash: (addr, ustake) => {
      bonded.set(addr, max(0n, (bonded.get(addr) || 0n) - ustake));
    },
    /** @param {Brand<'nat'>} stakingBrand */
    makeLienBridge: stakingBrand => {
      /** @param { bigint } v */
      const ubld = v => AmountMath.make(stakingBrand, v);

      /** @type {StakingAuthority} */
      const authority = Far('stakeReporter', {
        /**
         * @param { string } address
         * @param { Brand } brand
         */
        getAccountState: (address, brand) => {
          assert(brand === stakingBrand, X`unexpected brand: ${brand}`);
          assert(bankBalance.has(address), X`no such account: ${address}`);

          currentTime += 10n;
          return harden({
            total: ubld(qty(address, bankBalance)),
            bonded: ubld(qty(address, bonded)),
            locked: ubld(0n),
            liened: ubld(qty(address, liened)),
            unbonding: ubld(0n),
            currentTime: (currentTime += 3n),
          });
        },
        /** @type {(addr: string, p: Amount<'nat'>, t: Amount<'nat'>) => Promise<void>} */
        setLiened: async (address, previous, target) => {
          const { value } = AmountMath.coerce(stakingBrand, target);
          assert(AmountMath.isEqual(previous, ubld(qty(address, liened))));
          liened.set(address, value);
        },
      });
      return authority;
    },
    provisionAccount: (name, src) => {
      return harden({
        getName: () => name,
        getAddress: () => src,
        sendTo: (dest, n) => it.send(src, dest, n),
        stake: n => it.stake(src, n),
      });
    },
  });

  entries(genesisData).forEach(([addr, value]) => bankBalance.set(addr, value));
  return it;
};

const micro = harden({
  unit: 1_000_000n,
  displayInfo: { decimalPlaces: 6 },
});

const bootstrapZoeAndRun = async () => {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };

  const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

  const { zoeService: nonFarZoeService, feeMintAccess: nonFarFeeMintAccess } =
    makeZoeKit(makeFakeVatAdmin(setJig, makeRemote).admin);
  const feePurse = E(nonFarZoeService).makeFeePurse();
  const { brand: runBrandThere } = await E(feePurse).getCurrentAmount();
  const [runBrand, zoeService, feeMintAccess] = await Promise.all([
    makeFar(runBrandThere),
    E(nonFarZoeService).bindDefaultFeePurse(feePurse),
    makeFar(nonFarFeeMintAccess),
  ]);
  const zoe = makeFar(zoeService);

  const bld = makeIssuerKit('BLD', AssetKind.NAT, micro.displayInfo);

  return { zoe, feeMintAccess, runBrand, getJig: () => testJig, bld };
};

const bootstrapRunStake = async (bundles, timer) => {
  const { zoe, feeMintAccess, runBrand, bld } = await bootstrapZoeAndRun();
  const runIssuer = E(zoe).getFeeIssuer();

  const chain = mockChain({ addr1a: 1_000_000_000n * micro.unit });
  const lienBridge = chain.makeLienBridge(bld.brand);

  const space = await setupBootstrap(bundles, timer, zoe);
  const { produce, brand, issuer } = space;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);
  produce.runStakeBundle.resolve(bundles.runStake);
  produce.lienBridge.resolve(lienBridge);
  produce.chainTimerService.resolve(timer);
  brand.produce.BLD.resolve(bld.brand);
  brand.produce.RUN.resolve(runBrand);
  issuer.produce.BLD.resolve(bld.issuer);
  issuer.produce.RUN.resolve(runIssuer);

  const mockClient = harden({
    assignBundle: _fns => {
      // t.log('assignBundle:', fns);
    },
  });
  produce.client.resolve(mockClient);

  await Promise.all([startEconomicCommittee(space), startRunStake(space)]);
  return { chain, space };
};

const makeWalletMaker = creatorFacet => {
  const makeWallet = src => {
    const attMaker = E(creatorFacet).provideAttestationMaker(src);
    return harden({ attMaker });
  };
  return makeWallet;
};

/**
 * @param {bigint} value
 * @param {{
 *   centralSupplyBundle: ERef<SourceBundle>,
 *   feeMintAccess: ERef<FeeMintAccess>,
 *   zoe: ERef<ZoeService>,
 * }} powers
 * @returns { Promise<Payment> }
 */
const mintRunPayment = async (
  value,
  { centralSupplyBundle: centralP, feeMintAccess: feeMintAccessP, zoe },
) => {
  /** @type {[SourceBundle, FeeMintAccess]} */
  const [centralSupplyBundle, feeMintAccess] = await Promise.all([
    centralP,
    feeMintAccessP,
  ]);

  const { creatorFacet: ammSupplier } = await E(zoe).startInstance(
    E(zoe).install(centralSupplyBundle),
    {},
    { bootstrapPaymentValue: value },
    { feeMintAccess },
  );
  // TODO: stop the contract vat?
  return E(ammSupplier).getBootstrapPayment();
};

test('runStake API usage', async t => {
  const bundles = theBundles(t);
  const timer = buildManualTimer(t.log, 0n, 1n);

  const { chain, space } = await bootstrapRunStake(bundles, timer);
  const { consume } = space;
  // @ts-expect-error TODO: add runStakeCreatorFacet to EconomyBootstrapPowers
  const { zoe, runStakeCreatorFacet: creatorFacet } = consume;
  const runBrand = await space.brand.consume.RUN;
  const bldBrand = await space.brand.consume.BLD;
  const runIssuer = await space.issuer.consume.RUN;
  const publicFacet = E(zoe).getPublicFacet(space.instance.consume.runStake);

  const founder = chain.provisionAccount('Alice', 'addr1a');
  const bob = chain.provisionAccount('Bob', 'addr1b');
  founder.sendTo('addr1b', 5_000n * micro.unit);
  bob.stake(3_000n * micro.unit);

  const walletMaker = makeWalletMaker(creatorFacet);

  // Bob introduces himself to the Agoric JS VM.
  const bobWallet = walletMaker(bob.getAddress());

  // Bob gets a lien against 2k of his 3k staked BLD.
  const bobToLien = AmountMath.make(bldBrand, 2_000n * micro.unit);
  const attPmt = E(bobWallet.attMaker).makeAttestation(bobToLien);
  const runStakeTerms = await E(zoe).getTerms(
    await space.instance.consume.runStake,
  );
  const {
    issuers: { [KW.Attestation]: attIssuer },
  } = runStakeTerms;
  const attAmt = await E(attIssuer).getAmountOf(attPmt);

  // Bob borrows 200 RUN against the lien.
  const proposal = harden({
    give: { [KW.Attestation]: attAmt },
    want: { [KW.Debt]: AmountMath.make(runBrand, 200n * micro.unit) },
  });
  const seat = E(zoe).offer(
    E(publicFacet).makeLoanInvitation(),
    proposal,
    harden({ [KW.Attestation]: attPmt }),
  );
  const runPmt = E(seat).getPayout(KW.Debt);
  const actual = await E(runIssuer).getAmountOf(runPmt);
  t.deepEqual(actual, proposal.want[KW.Debt]);
});

test('extra offer keywords are rejected', async t => {
  const bundles = theBundles(t);
  const timer = buildManualTimer(t.log, 0n, SECONDS_PER_DAY);

  const { chain, space } = await bootstrapRunStake(bundles, timer);
  const { consume } = space;
  // @ts-expect-error TODO: add runStakeCreatorFacet to EconomyBootstrapPowers
  const { zoe, runStakeCreatorFacet: creatorFacet } = consume;
  const runBrand = await space.brand.consume.RUN;
  const bldBrand = await space.brand.consume.BLD;
  const publicFacet = E(zoe).getPublicFacet(space.instance.consume.runStake);

  const founder = chain.provisionAccount('Alice', 'addr1a');
  const bob = chain.provisionAccount('Bob', 'addr1b');
  founder.sendTo('addr1b', 5_000n * micro.unit);
  bob.stake(3_000n * micro.unit);

  const walletMaker = makeWalletMaker(creatorFacet);

  // Bob introduces himself to the Agoric JS VM.
  const bobWallet = walletMaker(bob.getAddress());

  // Bob gets a lien against 2k of his 3k staked BLD.
  const bobToLien = AmountMath.make(bldBrand, 2_000n * micro.unit);
  const attPmt = E(bobWallet.attMaker).makeAttestation(bobToLien);
  const {
    issuers: { [KW.Attestation]: attIssuer },
  } = await E(zoe).getTerms(await space.instance.consume.runStake);
  const attAmt = await E(attIssuer).getAmountOf(attPmt);

  // Bob borrows 200 RUN against the lien.
  const proposal = harden({
    give: { [KW.Attestation]: attAmt },
    want: {
      [KW.Debt]: AmountMath.make(runBrand, 199n * micro.unit),
      Pony: AmountMath.make(runBrand, 1n * micro.unit),
    },
  });
  const seat = E(zoe).offer(
    E(publicFacet).makeLoanInvitation(),
    proposal,
    harden({ [KW.Attestation]: attPmt }),
  );
  await t.throwsAsync(E(seat).getOfferResult(), {
    message: /Pony.*did not match/,
  });
});

/**
 * @param { StartFaker['publicFacet'] } faker
 * @param { Brand } bldBrand
 * @returns { Promise<[Amount, Payment]> }
 *
 * @param { (faker: ERef<StartFaker['publicFacet']>, bldBrand: Brand)
 *            => Promise<[Amount, Payment]> } [mockAttestation]
 *
 * @typedef {ReturnType<typeof import('./attestationFaker.js').start>} StartFaker
 * @typedef { [bigint, bigint] } Rational
 */
test('forged Attestation fails', async t => {
  const bundles = theBundles(t);
  const timer = buildManualTimer(t.log, 0n, 1n);

  const { chain, space } = await bootstrapRunStake(bundles, timer);
  const { consume } = space;
  const { zoe } = consume;
  const runBrand = await space.brand.consume.RUN;
  const bldBrand = await space.brand.consume.BLD;
  const publicFacet = E(zoe).getPublicFacet(space.instance.consume.runStake);

  const fakerInstallation = E(zoe).install(bundles.faker);
  const faker = E.get(E(zoe).startInstance(fakerInstallation)).publicFacet;

  const founder = chain.provisionAccount('Alice', 'addr1a');
  const mallory = chain.provisionAccount('Mallory', 'addr1m');
  founder.sendTo('addr1m', 5_000n * micro.unit);
  mallory.stake(3_000n * micro.unit);

  // Mallory forges a lien against 2k of his 3k staked BLD.
  const malloryToLien = AmountMath.make(bldBrand, 2_000n * micro.unit);
  const attPmt = E(faker).fakeAttestation('addr1m', malloryToLien);

  const attIssuer = E(faker).getIssuer();
  const attAmt = await E(attIssuer).getAmountOf(attPmt);

  // Mallory tries to borrow 200 RUN against the forged lien.
  const proposal = harden({
    give: { [KW.Attestation]: attAmt },
    want: { [KW.Debt]: AmountMath.make(runBrand, 200n * micro.unit) },
  });
  const seat = E(zoe).offer(
    E(publicFacet).makeLoanInvitation(),
    proposal,
    harden({ [KW.Attestation]: attPmt }),
  );
  await t.throwsAsync(E(seat).getOfferResult());
});

/**
 * Economic Committee of one.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<CommitteeElectorateCreatorFacet>} electorateCreator
 * @param {ERef<GovernedContractFacetAccess<unknown>>} runStakeGovernorCreatorFacet
 * @param {Installation} counter
 */
const makeC1 = async (
  zoe,
  electorateCreator,
  runStakeGovernorCreatorFacet,
  counter,
) => {
  const [invitation] = await E(electorateCreator).getVoterInvitations();
  const seat = E(zoe).offer(invitation);
  const voteFacet = E(seat).getOfferResult();
  return harden({
    setMintingRatio: async (newValue, deadline) => {
      const paramSpec = { key: 'main', parameterName: 'MintingRatio' };

      /** @type { ParamChangeVoteResult } */
      const { details, instance } = await E(
        runStakeGovernorCreatorFacet,
      ).voteOnParamChange(paramSpec, newValue, counter, deadline);
      const { questionHandle, positions } = await details;
      const cast = E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
      const count = E(zoe).getPublicFacet(instance);
      const outcome = E(count).getOutcome();
      return { cast, outcome };
    },
  });
};

const approxEqual = (t, actual, expected, epsilon) => {
  const { min, max, subtract, isGTE } = AmountMath;
  if (isGTE(epsilon, subtract(max(actual, expected), min(actual, expected)))) {
    t.pass();
  } else {
    t.deepEqual(actual, expected);
  }
};

const makeWorld = async t0 => {
  const bundles = theBundles(t0);
  const timer = buildManualTimer(t0.log, 0n, SECONDS_PER_DAY);
  const { chain, space } = await bootstrapRunStake(bundles, timer);
  const { consume } = space;

  // @ts-ignore TODO: runStakeCreatorFacet type in vats
  const { zoe, runStakeCreatorFacet, lienBridge } = consume;
  const { RUN: runIssuer } = space.issuer.consume;
  const [bldBrand, runBrand] = await Promise.all([
    space.brand.consume.BLD,
    space.brand.consume.RUN,
  ]);
  const { runStake: runStakeinstance } = space.instance.consume;
  const runStake = {
    instance: runStakeinstance,
    publicFacet: E(zoe).getPublicFacet(runStakeinstance),
    creatorFacet: runStakeCreatorFacet,
  };

  const counter = await space.installation.consume.binaryVoteCounter;
  const committee = makeC1(
    zoe,
    space.consume.economicCommitteeCreatorFacet,
    // @ts-expect-error TODO: add runStakeGovernorCreatorFacet to vats/src/types.js
    space.consume.runStakeGovernorCreatorFacet,
    counter,
  );

  const {
    issuers: { [KW.Attestation]: attIssuer },
    brands: { [KW.Attestation]: attBrand },
  } = await E(zoe).getTerms(await runStake.instance);

  /** @param { Payment } att */
  const returnAttestation = async att => {
    const invitation = E(runStake.publicFacet).makeReturnAttInvitation();
    const attestationAmount = await E(attIssuer).getAmountOf(att);
    const proposal = harden({ give: { [KW.Attestation]: attestationAmount } });
    const payments = harden({ [KW.Attestation]: att });
    const userSeat = E(zoe).offer(invitation, proposal, payments);
    return E(userSeat).getOfferResult();
  };

  const founder = chain.provisionAccount('founder', 'addr1a');
  const bob = chain.provisionAccount('Bob', 'addr1b');

  const walletMaker = makeWalletMaker(runStake.creatorFacet);

  // Bob introduces himself to the Agoric JS VM.
  const bobWallet = walletMaker(bob.getAddress());

  const attPurse = E(attIssuer).makeEmptyPurse();
  const runPurse = E(runIssuer).makeEmptyPurse();
  const rewardPurse = E(runIssuer).makeEmptyPurse();
  const epsilon = AmountMath.make(runBrand, micro.unit / 5n);

  await E(rewardPurse).deposit(
    await mintRunPayment(500n * micro.unit, {
      centralSupplyBundle: consume.centralSupplyBundle,
      feeMintAccess: consume.feeMintAccess,
      zoe,
    }),
  );

  let offerResult;
  const driver = harden({
    buyBLD: n => founder.sendTo(bob.getAddress(), n * micro.unit),
    stakeBLD: n => bob.stake(n * micro.unit),
    slash: n => chain.slash(bob.getAddress(), n * micro.unit),
    waitDays: async n => {
      for (let i = 0; i < n; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await timer.tick();
      }
    },
    lienBLD: async target => {
      const current = await E(bobWallet.attMaker).getAccountState(
        bob.getAddress(),
        bldBrand,
      );
      const delta = AmountMath.subtract(
        AmountMath.make(bldBrand, target * micro.unit),
        current.liened,
      );
      const attPmt = await E(bobWallet.attMaker).makeAttestation(delta);
      await E(attPurse).deposit(attPmt);
    },
    checkBLDStaked: async (expected, t) => {
      const actual = await E(lienBridge).getAccountState(
        bob.getAddress(),
        bldBrand,
      );
      t.deepEqual(
        actual.bonded,
        AmountMath.make(bldBrand, expected * micro.unit),
      );
    },
    checkBLDLiened: async (expected, t) => {
      const actual = await E(lienBridge).getAccountState(
        bob.getAddress(),
        bldBrand,
      );
      t.deepEqual(
        actual.liened,
        AmountMath.make(bldBrand, expected * micro.unit),
      );
    },
    borrowRUN: async n => {
      const attAmt = await E(attPurse).getCurrentAmount();
      const attPmt = await E(attPurse).withdraw(attAmt);
      const proposal = harden({
        give: { [KW.Attestation]: attAmt },
        want: { [KW.Debt]: AmountMath.make(runBrand, n * micro.unit) },
      });
      const seat = E(zoe).offer(
        E(runStake.publicFacet).makeLoanInvitation(),
        proposal,
        harden({ [KW.Attestation]: attPmt }),
      );
      const runPmt = await E(seat).getPayout(KW.Debt);
      E(runPurse).deposit(runPmt);
      offerResult = await E(seat).getOfferResult();
    },
    earnRUNReward: async n => {
      const amt = AmountMath.make(runBrand, n * micro.unit);
      const pmt = await E(rewardPurse).withdraw(amt);
      await E(runPurse).deposit(pmt);
    },
    borrowMoreRUN: async n => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const runAmt = AmountMath.make(runBrand, n * micro.unit);
      const attAmt = await E(attPurse).getCurrentAmount();
      const attPmt = await E(attPurse).withdraw(attAmt);
      const proposal = harden({
        give: { [KW.Attestation]: attAmt },
        want: { [KW.Debt]: runAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
        harden({ [KW.Attestation]: attPmt }),
      );
      await E(seat).getOfferResult(); // check for errors
      const runPmt = await E(seat).getPayout(KW.Debt);
      await E(runPurse).deposit(runPmt);
    },
    unlienBLD: async n => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const attAmt = AmountMath.make(
        attBrand,
        makeCopyBag([[bob.getAddress(), n * micro.unit]]),
      );
      const proposal = harden({
        want: { [KW.Attestation]: attAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
      );
      await E(seat).getOfferResult(); // check for errors
      const attBack = await E(seat).getPayout(KW.Attestation);
      await returnAttestation(attBack);
    },
    payDownRUN: async value => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const runAmt = AmountMath.make(runBrand, value * micro.unit);
      const runPmt = await E(runPurse).withdraw(runAmt);
      const proposal = harden({
        give: { [KW.Debt]: runAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
        harden({ [KW.Debt]: runPmt }),
      );
      await E(seat).getOfferResult(); // check for errors
    },
    payToUnlien: async ([pay, unlien]) => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const proposal = harden({
        give: { [KW.Debt]: AmountMath.make(runBrand, pay * micro.unit) },
        want: {
          [KW.Attestation]: AmountMath.make(
            attBrand,
            makeCopyBag([[bob.getAddress(), unlien * micro.unit]]),
          ),
        },
      });
      const runPmt = await E(runPurse).withdraw(proposal.give[KW.Debt]);
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
        harden({ [KW.Debt]: runPmt }),
      );
      await E(seat).getOfferResult(); // check for errors
      const attBack = await E(seat).getPayout(KW.Attestation);
      await returnAttestation(attBack);
    },
    payoffRUN: async value => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const proposal = harden({
        give: { [KW.Debt]: AmountMath.make(runBrand, value * micro.unit) },
        want: {
          // TODO: want amount should match amount liened
          [KW.Attestation]: AmountMath.makeEmpty(attBrand, AssetKind.COPY_BAG),
        },
      });
      const runPayment = await E(runPurse).withdraw(proposal.give[KW.Debt]);
      const seat = await E(zoe).offer(
        E(offerResult.invitationMakers).CloseVault(),
        proposal,
        harden({ [KW.Debt]: runPayment }),
      );
      await E(seat).getOfferResult(); // 'RUN line of credit closed'
      const attBack = await E(seat).getPayout(KW.Attestation);

      await returnAttestation(attBack);
    },
    checkRUNBalance: async (target, t) => {
      const actual = await E(runPurse).getCurrentAmount();
      approxEqual(
        t,
        actual,
        AmountMath.make(runBrand, target * micro.unit),
        epsilon,
      );
    },
    checkRUNDebt: async (expected, t) => {
      const { vault } = offerResult;
      const debt = await E(vault).getCurrentDebt();
      approxEqual(
        t,
        debt,
        AmountMath.make(runBrand, expected * micro.unit),
        epsilon,
      );
    },
    setMintingRatio: async newRunToBld => {
      /** @type {(r: Rational, b?: Brand) => Ratio} */
      const pairToRatio = ([n, d], brand2 = undefined) =>
        makeRatio(n, runBrand, d, brand2);
      const newValue = pairToRatio(newRunToBld, bldBrand);

      const deadline = 3n * SECONDS_PER_DAY;
      const { cast, outcome } = await E(committee).setMintingRatio(
        newValue,
        deadline,
      );
      await cast;
      await E(timer).tick();
      await E(timer).tick();
      await E(timer).tick();
      await outcome;
    },
  });

  return driver;
};

const makeTests = async () => {
  for await (const [num, name, steps] of TestData) {
    test(`Test Data ${num} ${name}`, async t => {
      // TODO: use different accounts / addresses in the same world.
      const driver = await makeWorld(t);
      for await (const [tag, value, pass] of steps) {
        t.log({ tag, value });
        const fn = driver[tag];
        if (!fn) {
          throw Error(`bad tag: ${tag}`);
        }
        if (pass === false) {
          await t.throwsAsync(async () => fn(value, t));
        } else {
          await fn(value, t);
        }
      }
    });
  }
};

makeTests();
