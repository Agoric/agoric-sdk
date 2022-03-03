// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { resolve as metaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';
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
import { startEconomicCommittee, startGetRun } from '../src/econ-behaviors.js';
import { governanceBundles } from '../src/importedBundles.js';
import * as Collect from '../src/collect.js';
import { CreditTerms } from '../src/getRUN.js';

// 8	Partial repayment from reward stream - TODO
// TODO: #4728 case 9: Extending LoC - unbonded (FAIL)

// skipping:
// 10	Partial repay - insufficient funds (FAIL) - Zoe prevents this
// 12	Add collateral - lots of test harness for little gain
// 13	Add collateral - CR increase ok
import { CASES as TestData } from './getRUN-test-steps.js';

const contractRoots = {
  getRUN: '../src/getRUN.js',
  faker: './attestationFaker.js',
};

const { assign, entries } = Object;
const { details: X } = assert;

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

/**
 * @typedef {EconomyBootstrapPowers & WellKnownSpaces & {
 *   consume: {
 *     client: ERef<ClientManager> // to add home.attMaker
 *   },
 *   produce: {
 *     client: Producer<ClientManager>
 *   }
 * }} GetRunPowers
 */

export const setupBootstrap = async (
  bundles,
  timer = buildManualTimer(console.log),
  zoe,
) => {
  if (!zoe) {
    ({ zoe } = await setUpZoeForTest());
  }

  const space = /** @type {any} */ (makePromiseSpace());
  const { produce, consume } = /** @type { GetRunPowers } */ (space);

  produce.chainTimerService.resolve(timer);
  produce.zoe.resolve(zoe);

  const { agoricNames, spaces } = makeAgoricNamesAccess();
  produce.agoricNames.resolve(agoricNames);

  produce.governanceBundles.resolve(governanceBundles);

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
    /** @param {Brand} stakingBrand */
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
        /** @type {(addr: string, amt: Amount<bigint>) => Promise<void>} */
        setLiened: async (address, amount) => {
          const { value } = AmountMath.coerce(stakingBrand, amount);
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

const bootstrapGetRun = async (bundles, timer) => {
  const { zoe, feeMintAccess, runBrand, bld } = await bootstrapZoeAndRun();
  const runIssuer = E(zoe).getFeeIssuer();

  const chain = mockChain({ addr1a: 1_000_000_000n * micro.unit });
  const lienBridge = chain.makeLienBridge(bld.brand);

  const space = await setupBootstrap(bundles, timer, zoe);
  const { produce, brand, issuer } = space;
  produce.zoe.resolve(zoe);
  produce.feeMintAccess.resolve(feeMintAccess);
  produce.getRUNBundle.resolve(bundles.getRUN);
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

  await Promise.all([startEconomicCommittee(space), startGetRun(space)]);
  return { chain, space };
};

const makeWalletMaker = creatorFacet => {
  const makeWallet = src => {
    const attMaker = E(creatorFacet).getAttMaker(src);
    return harden({ attMaker });
  };
  return makeWallet;
};

test('getRUN API usage', async t => {
  const bundles = theBundles(t);
  const timer = buildManualTimer(t.log, 0n, 1n);

  const { chain, space } = await bootstrapGetRun(bundles, timer);
  const { consume } = space;
  // @ts-expect-error TODO: add getRUNCreatorFacet to EconomyBootstrapPowers
  const { zoe, getRUNCreatorFacet: creatorFacet } = consume;
  const runBrand = await space.brand.consume.RUN;
  const bldBrand = await space.brand.consume.BLD;
  const runIssuer = await space.issuer.consume.RUN;
  const publicFacet = E(zoe).getPublicFacet(space.instance.consume.getRUN);

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
  const attIssuer = E(publicFacet).getIssuer();
  const attAmt = await E(attIssuer).getAmountOf(attPmt);

  // Bob borrows 200 RUN against the lien.
  const proposal = harden({
    give: { Attestation: attAmt },
    want: { RUN: AmountMath.make(runBrand, 200n * micro.unit) },
  });
  const seat = E(zoe).offer(
    E(publicFacet).makeLoanInvitation(),
    proposal,
    harden({ Attestation: attPmt }),
  );
  const runPmt = E(seat).getPayout('RUN');
  const actual = await E(runIssuer).getAmountOf(runPmt);
  t.deepEqual(actual, proposal.want.RUN);
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

  const { chain, space } = await bootstrapGetRun(bundles, timer);
  const { consume } = space;
  const { zoe } = consume;
  const runBrand = await space.brand.consume.RUN;
  const bldBrand = await space.brand.consume.BLD;
  const publicFacet = E(zoe).getPublicFacet(space.instance.consume.getRUN);

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
    give: { Attestation: attAmt },
    want: { RUN: AmountMath.make(runBrand, 200n * micro.unit) },
  });
  const seat = E(zoe).offer(
    E(publicFacet).makeLoanInvitation(),
    proposal,
    harden({ Attestation: attPmt }),
  );
  await t.throwsAsync(E(seat).getOfferResult());
});

/**
 * Economic Committee of one.
 *
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<CommitteeElectorateCreatorFacet>} electorateCreator
 * @param {ERef<GovernedContractFacetAccess>} getRUNGovernorCreatorFacet
 * @param {Installation} counter
 */
const makeC1 = async (
  zoe,
  electorateCreator,
  getRUNGovernorCreatorFacet,
  counter,
) => {
  const [invitation] = await E(electorateCreator).getVoterInvitations();
  const seat = E(zoe).offer(invitation);
  const voteFacet = E(seat).getOfferResult();
  return harden({
    setCollateralizationRatio: async (newValue, deadline) => {
      const paramSpec = {
        key: 'main',
        parameterName: CreditTerms.CollateralizationRatio,
      };

      /** @type { ParamChangeVoteResult } */
      const { details, instance } = await E(
        getRUNGovernorCreatorFacet,
      ).voteOnParamChange(paramSpec, newValue, counter, deadline);
      const { questionHandle, positions } = await details;
      const cast = E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
      const count = E(zoe).getPublicFacet(instance);
      const outcome = E(count).getOutcome();
      return { cast, outcome };
    },
  });
};

const makeWorld = async t0 => {
  const bundles = theBundles(t0);
  const timer = buildManualTimer(t0.log, 0n, 1n);
  const { chain, space } = await bootstrapGetRun(bundles, timer);
  const { consume } = space;

  // @ts-ignore TODO: getRUNCreatorFacet type in vats
  const { zoe, getRUNCreatorFacet, lienBridge } = consume;
  const { RUN: runIssuer } = space.issuer.consume;
  const [bldBrand, runBrand] = await Promise.all([
    space.brand.consume.BLD,
    space.brand.consume.RUN,
  ]);
  const { getRUN: getRUNinstance } = space.instance.consume;
  const getRUN = {
    instance: getRUNinstance,
    publicFacet: E(zoe).getPublicFacet(getRUNinstance),
    creatorFacet: getRUNCreatorFacet,
  };

  const counter = await space.installation.consume.binaryVoteCounter;
  const committee = makeC1(
    zoe,
    space.consume.economicCommitteeCreatorFacet,
    // @ts-expect-error TODO: add getRUNGovernorCreatorFacet to vats/src/types.js
    space.consume.getRUNGovernorCreatorFacet,
    counter,
  );

  const attIssuer = E(getRUN.publicFacet).getIssuer();
  const attBrand = await E(attIssuer).getBrand();

  /** @param { Payment } att */
  const returnAttestation = async att => {
    const invitation = E(getRUN.publicFacet).makeReturnAttInvitation();
    const attestationAmount = await E(attIssuer).getAmountOf(att);
    const proposal = harden({ give: { Attestation: attestationAmount } });
    const payments = harden({ Attestation: att });
    const userSeat = E(zoe).offer(invitation, proposal, payments);
    return E(userSeat).getOfferResult();
  };

  const founder = chain.provisionAccount('founder', 'addr1a');
  const bob = chain.provisionAccount('Bob', 'addr1b');

  const walletMaker = makeWalletMaker(getRUN.creatorFacet);

  // Bob introduces himself to the Agoric JS VM.
  const bobWallet = walletMaker(bob.getAddress());

  const attPurse = E(attIssuer).makeEmptyPurse();
  const runPurse = E(runIssuer).makeEmptyPurse();
  let offerResult;
  const driver = harden({
    buyBLD: n => founder.sendTo(bob.getAddress(), n * micro.unit),
    stakeBLD: n => bob.stake(n * micro.unit),
    slash: n => chain.slash(bob.getAddress(), n * micro.unit),
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
        give: { Attestation: attAmt },
        want: { RUN: AmountMath.make(runBrand, n * micro.unit) },
      });
      const seat = E(zoe).offer(
        E(getRUN.publicFacet).makeLoanInvitation(),
        proposal,
        harden({ Attestation: attPmt }),
      );
      const runPmt = await E(seat).getPayout('RUN');
      E(runPurse).deposit(runPmt);
      offerResult = await E(seat).getOfferResult();
    },
    borrowMoreRUN: async n => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const runAmt = AmountMath.make(runBrand, n * micro.unit);
      const attAmt = await E(attPurse).getCurrentAmount();
      const attPmt = await E(attPurse).withdraw(attAmt);
      const proposal = harden({
        give: { Attestation: attAmt },
        want: { RUN: runAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
        harden({ Attestation: attPmt }),
      );
      await E(seat).getOfferResult(); // check for errors
      const runPmt = await E(seat).getPayout('RUN');
      await E(runPurse).deposit(runPmt);
    },
    unlienBLD: async n => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const attAmt = AmountMath.make(
        attBrand,
        makeCopyBag([[bob.getAddress(), n * micro.unit]]),
      );
      const proposal = harden({
        want: { Attestation: attAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
      );
      await E(seat).getOfferResult(); // check for errors
      const attBack = await E(seat).getPayout('Attestation');
      await returnAttestation(attBack);
    },
    payDownRUN: async value => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const runAmt = AmountMath.make(runBrand, value * micro.unit);
      const runPmt = await E(runPurse).withdraw(runAmt);
      const proposal = harden({
        give: { RUN: runAmt },
      });
      const seat = E(zoe).offer(
        E(offerResult.invitationMakers).AdjustBalances(),
        proposal,
        harden({ RUN: runPmt }),
      );
      await E(seat).getOfferResult(); // check for errors
    },
    payoffRUN: async value => {
      assert(offerResult, X`no offerResult; borrowRUN first?`);
      const proposal = harden({
        give: { RUN: AmountMath.make(runBrand, value * micro.unit) },
        want: {
          // TODO: want amount should match amount liened
          Attestation: AmountMath.makeEmpty(attBrand, AssetKind.COPY_BAG),
        },
      });
      const runPayment = await E(runPurse).withdraw(proposal.give.RUN);
      const seat = await E(zoe).offer(
        E(offerResult.invitationMakers).CloseVault(),
        proposal,
        harden({ RUN: runPayment }),
      );
      await E(seat).getOfferResult(); // 'RUN line of credit closed'
      const attBack = await E(seat).getPayout('Attestation');

      await returnAttestation(attBack);
    },
    checkRUNBalance: async (target, t) => {
      const actual = await E(runPurse).getCurrentAmount();
      t.deepEqual(actual, AmountMath.make(runBrand, target * micro.unit));
    },
    checkRUNDebt: async (expected, t) => {
      const { uiNotifier } = offerResult;
      const state = await uiNotifier.getUpdateSince();
      t.deepEqual(
        state.value.debt,
        AmountMath.make(runBrand, expected * micro.unit),
      );
    },
    setCollateralizationRatio: async newBldToRun => {
      /** @type {(r: Rational, b?: Brand) => Ratio} */
      const pairToRatio = ([n, d], brand2 = undefined) =>
        makeRatio(n, runBrand, d, brand2);
      const newValue = pairToRatio(newBldToRun);

      const deadline = 3n;
      const { cast, outcome } = await E(committee).setCollateralizationRatio(
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
