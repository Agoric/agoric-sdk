// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { resolve as metaResolve } from 'import-meta-resolve';
import { makeFakeVatAdmin } from '@agoric/zoe/tools/fakeVatAdmin.js';
import { makeZoeKit } from '@agoric/zoe';
import { E } from '@agoric/eventual-send';
import { Far, makeLoopback } from '@agoric/captp';
import bundleSource from '@agoric/bundle-source';
import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { ParamType } from '@agoric/governance';
import { bootstrapAttestation } from '@agoric/zoe/src/contracts/attestation/bootstrapAttestation.js';

import { CreditTerms } from '../src/runLoC.js';
import * as testCases from './runLoC-test-case-sheet.js';

const contractRoots = {
  runLoC: '../src/runLoC.js',
  attestation: '@agoric/zoe/src/contracts/attestation/attestation.js',
  electorate: '@agoric/governance/src/noActionElectorate.js',
  governor: '@agoric/governance/src/contractGovernor.js',
  faker: './attestationFaker.js',
};

const { assign, entries, fromEntries, keys, values } = Object;
const { details: X } = assert;

const Collect = {
  /**
   * @param {Record<string, V>} obj
   * @param {(v: V) => U} f
   * @returns {Record<string, U>}
   * @template V
   * @template U
   */
  mapValues: (obj, f) => fromEntries(entries(obj).map(([p, v]) => [p, f(v)])),
  /**
   * @param {X[]} xs
   * @param {Y[]} ys
   * @returns {[X, Y][]}
   * @template X
   * @template Y
   */
  zip: (xs, ys) => xs.map((x, i) => [x, ys[i]]),
  /**
   * @param {Record<string, ERef<V>>} obj
   * @returns {Promise<Record<string, V>>}
   * @template V
   */
  allValues: async obj =>
    fromEntries(Collect.zip(keys(obj), await Promise.all(values(obj)))),
};

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

const genesisBldBalances = {
  agoric30: 30n,
  agoric100: 100n,
  agoric500: 500n,
  agoric1k: 1_000n,
  agoric3k: 3_000n,
  agoric5k: 5_000n,
  agoric9k: 9_000n,
  agoric10k: 10_000n,
};

/**
 * @param {Brand} stakingBrand
 * @returns {StakingAuthority}
 */
const mockBridge = stakingBrand => {
  /** @param { bigint } v */
  const ubld = v => AmountMath.make(stakingBrand, v);
  let currentTime = 50n;
  return Far('stakeReporter', {
    /**
     * @param { string } address
     * @param { Brand } brand
     */
    getAccountState: (address, brand) => {
      assert(brand === stakingBrand, X`unexpected brand: ${brand}`);
      assert(address in genesisBldBalances, X`no such account: ${address}`);
      const balance = genesisBldBalances[address];
      currentTime += 10n;
      return harden({
        total: ubld(balance + 5n),
        bonded: ubld(balance),
        locked: ubld(0n),
        liened: ubld(0n),
        unbonding: ubld(0n),
        currentTime,
      });
    },
  });
};

const bootstrapZoeAndRun = async () => {
  let testJig;
  const setJig = jig => {
    testJig = jig;
  };

  const { makeFar, makeNear: makeRemote } = makeLoopback('zoeTest');

  const {
    zoeService: nonFarZoeService,
    feeMintAccess: nonFarFeeMintAccess,
  } = makeZoeKit(makeFakeVatAdmin(setJig, makeRemote).admin);
  const feePurse = E(nonFarZoeService).makeFeePurse();
  const { brand: runBrandThere } = await E(feePurse).getCurrentAmount();
  const [runBrand, zoeService, feeMintAccess] = await Promise.all([
    makeFar(runBrandThere),
    E(nonFarZoeService).bindDefaultFeePurse(feePurse),
    makeFar(nonFarFeeMintAccess),
  ]);
  const zoe = makeFar(zoeService);
  return { zoe, feeMintAccess, runBrand, getJig: () => testJig };
};

test('RUN mint access', async t => {
  assert.typeof(t.context, 'object');
  assert(t.context);

  const { zoe, feeMintAccess } = await bootstrapZoeAndRun();
  t.truthy(zoe);
  t.truthy(feeMintAccess);
});

test('start attestation', async t => {
  const { zoe } = await bootstrapZoeAndRun();
  const micro = harden({ decimalPlaces: 6 });
  const { mint: _, ...bld } = makeIssuerKit('BLD', AssetKind.NAT, micro);

  const { attestation: bundle } = theBundles(t);
  const { issuer, brand, creatorFacet } = await bootstrapAttestation(
    bundle,
    zoe,
    bld.issuer,
    mockBridge(bld.brand),
    { expiringAttName: 'BldAttGov', returnableAttName: 'BldAttLoC' },
  );

  const attMaker = E(creatorFacet).getAttMaker('agoric3k');
  const expiration = 120n;
  const amountLiened = AmountMath.make(bld.brand, 5n);
  const pmt = E.get(E(attMaker).makeAttestations(amountLiened, expiration))
    .returnable;
  const amt = await E(issuer).getAmountOf(pmt);
  t.deepEqual(amt, {
    brand,
    value: [{ address: 'agoric3k', amountLiened }],
  });
});

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */

/**
 * @param {ERef<ZoeService>} zoe
 * @param {ERef<TimerService>} timer
 * @param { FeeMintAccess } feeMintAccess
 * @param {Record<string, Bundle>} bundles
 * @param {Object} terms
 * @param {Ratio} terms.collateralPrice
 * @param {Ratio} terms.collateralizationRatio
 * @param {Issuer} attIssuer
 *
 * @typedef {Unpromise<ReturnType<typeof import('../src/runLoC.js').start>>} StartLineOfCredit
 */
const bootstrapRunLoC = async (
  zoe,
  timer,
  feeMintAccess,
  bundles,
  { collateralPrice, collateralizationRatio },
  attIssuer,
) => {
  const installations = await Collect.allValues({
    governor: E(zoe).install(bundles.governor),
    electorate: E(zoe).install(bundles.electorate),
    runLoC: E(zoe).install(bundles.runLoC),
  });

  const {
    creatorFacet: electorateCreatorFacet,
    instance: electorateInstance,
  } = await E(zoe).startInstance(installations.electorate);
  // t.log({ electorateCreatorFacet, electorateInstance });

  const main = harden([
    {
      name: CreditTerms.CollateralPrice,
      type: ParamType.RATIO,
      value: collateralPrice,
    },
    {
      name: CreditTerms.CollateralizationRatio,
      type: ParamType.RATIO,
      value: collateralizationRatio,
    },
  ]);

  const governorFacets = await E(zoe).startInstance(
    installations.governor,
    {},
    {
      timer,
      electorateInstance,
      governedContractInstallation: installations.runLoC,
      governed: harden({
        terms: { main },
        issuerKeywordRecord: { Attestation: attIssuer },
        privateArgs: { feeMintAccess },
      }),
    },
    harden({ electorateCreatorFacet }),
  );

  const governedInstance = await E(governorFacets.creatorFacet).getInstance();
  /** @type {ERef<StartLineOfCredit['publicFacet']>} */
  const publicFacet = E(zoe).getPublicFacet(governedInstance);

  return { publicFacet };
};

/**
 * @param { Rational } price
 * @param { Object } detail
 * @param { number } detail.testNum
 * @param { string } detail.description
 * @param {{ before: Rational, after?: Rational}} detail.collateralizationRatio
 * @param {{ before: bigint, delta: bigint, after: bigint}} detail.borrowed
 * @param { bigint } detail.staked
 * @param {{ before: bigint, delta: bigint, after: bigint}} detail.liened
 * @param { boolean } [detail.failAttestation]
 * @param { boolean } [detail.failOffer]
 * @param { (faker: StartFaker['publicFacet'], bldBrand: Brand)
 *            => Promise<[Amount, Payment]> } [mockAttestation]
 *
 * @typedef {ReturnType<typeof import('./attestationFaker.js').start>} StartFaker
 * @typedef { [bigint, bigint] } Rational
 */
const testLoC = (
  price,
  {
    testNum,
    description,
    collateralizationRatio: cr,
    borrowed,
    staked,
    liened,
    failAttestation,
    failOffer,
  },
  mockAttestation = undefined,
) => {
  const todo = fromEntries(
    entries({
      adjustLien:
        liened.before !== 0n && liened.delta !== 0n && borrowed.after !== 0n,
      collateralizationRatioChange: !!cr.after,
      failing: !!description.match(/FAIL/),
      unbonded: !!description.match(/unbonded/),
    }).filter(([_why, cond]) => cond),
  );

  if (keys(todo).length > 0) {
    const reasons = keys(todo).join(',');
    test.skip(`${testNum} ${description} @@TODO ${reasons}`, _ => {});
    return;
  }

  test(`${testNum} ${description}`, async t => {
    const bundles = theBundles(t);

    // Genesis: start Zoe etc.
    const { zoe, feeMintAccess, runBrand, getJig } = await bootstrapZoeAndRun();
    const micro = harden({ decimalPlaces: 6 });
    const { mint: _, ...bld } = makeIssuerKit('BLD', AssetKind.NAT, micro);

    // start attestation contract
    const {
      brand: attBrand,
      issuer: attIssuer,
      creatorFacet,
    } = await bootstrapAttestation(
      bundles.attestation,
      zoe,
      bld.issuer,
      mockBridge(bld.brand),
      { expiringAttName: 'BldAttGov', returnableAttName: 'BldAttLoC' },
    );

    // start RUN LoC
    const collateralPrice = makeRatio(price[0], runBrand, price[1], bld.brand);
    const rate = cr.before;
    const collateralizationRatio = makeRatio(rate[0], runBrand, rate[1]);
    const timer = buildManualTimer(t.log, 0n, 1n);
    const { publicFacet } = await bootstrapRunLoC(
      zoe,
      timer,
      feeMintAccess,
      bundles,
      { collateralPrice, collateralizationRatio },
      attIssuer,
    );

    /** @type {{ runBrand: Brand, runIssuer: Issuer }} */
    const { runIssuer } = getJig();
    /** @param { bigint } value */
    const run = value => AmountMath.make(runBrand, value);
    /** @param { bigint } value */
    const ubld = value => AmountMath.make(bld.brand, value);

    // Get an attestation (amount, payment)
    const [addrFromStake, _b] =
      entries(genesisBldBalances).find(([_addr, bal]) => bal === staked) ||
      assert.fail(X`no matching account: ${staked}`);
    const attMaker = E(creatorFacet).getAttMaker(addrFromStake);
    const expiration = 61n;

    // @ts-ignore governance wrapper obscures publicFace type :-/
    const lineOfCreditInvitation = await E(publicFacet).makeLoanInvitation();

    /**
     * @param {bigint} bldValue
     * @param {bigint} runValue
     */
    const testOpen = async (bldValue, runValue) => {
      const tryAttestations = E(attMaker).makeAttestations(
        ubld(bldValue),
        expiration,
      );
      if (failAttestation) {
        await t.throwsAsync(tryAttestations);
        return undefined;
      }
      /** @returns { Promise<[Amount, Payment]> } */
      const getReturnableAttestation = () =>
        E.get(tryAttestations).returnable.then(pmt =>
          E(attIssuer)
            .getAmountOf(pmt)
            .then(amt => [amt, pmt]),
        );
      const fakerInstallation = E(zoe).install(bundles.faker);
      const [attAmt, attPmt] = await (mockAttestation
        ? mockAttestation(
            (await E(zoe).startInstance(fakerInstallation)).publicFacet,
            bld.brand,
          )
        : getReturnableAttestation());
      // t.log({ attPmt });

      // t.log({
      //   give: { Attestation: attAmt },
      //   want: { RUN: run(runValue) },
      //   collateralPrice,
      //   collateralizationRatio,
      // });

      // Offer the attestation in exchange for RUN
      const seat = await E(zoe).offer(
        lineOfCreditInvitation,
        harden({
          give: { Attestation: attAmt },
          want: { RUN: run(runValue) },
        }),
        harden({ Attestation: attPmt }),
      );
      const result = E(seat).getOfferResult();
      if (failOffer) {
        await t.throwsAsync(result);
        return undefined;
      }
      /** @type {LineOfCreditKit} */
      const resultValue = await result;
      t.deepEqual(keys(resultValue), [
        'invitationMakers',
        'uiNotifier',
        'vault',
      ]);
      const state = await resultValue.uiNotifier.getUpdateSince();
      t.deepEqual(state.value.debt, run(runValue));

      const p = await Collect.allValues(await E(seat).getPayouts());
      t.deepEqual(Object.keys(p), ['Attestation', 'RUN']);
      t.deepEqual(await E(runIssuer).getAmountOf(p.RUN), run(runValue));

      return { resultValue, payouts: p };
    };

    /** @param { Unpromise<ReturnType<typeof testOpen>> } step1 */
    const testClose = async step1 => {
      assert(step1);
      const {
        resultValue: { invitationMakers },
        payouts,
      } = step1;
      const closeInvitation = await invitationMakers.CloseVault();
      const seat = await E(zoe).offer(
        closeInvitation,
        harden({
          give: { RUN: run(-borrowed.delta) },
          want: {
            Attestation: AmountMath.makeEmpty(attBrand, AssetKind.SET),
          },
        }),
        harden({ RUN: payouts.RUN }),
      );
      t.deepEqual(await E(seat).getOfferResult(), 'RUN line of credit closed');
      const attBack = await E(seat).getPayout('Attestation');
      const amt = await E(attIssuer).getAmountOf(attBack);
      t.deepEqual(amt, {
        brand: attBrand,
        value: [
          {
            address: addrFromStake,
            amountLiened: ubld(liened.before),
          },
        ],
      });
    };

    /** @param { Unpromise<ReturnType<typeof testOpen>> } step1 */
    const testAdjust = async step1 => {
      assert(step1);
      const {
        resultValue: { invitationMakers, uiNotifier },
      } = step1;

      const adjustInvitation = invitationMakers.AdjustBalances();

      if (borrowed.delta > 0n) {
        const seat = await E(zoe).offer(
          adjustInvitation,
          harden({ want: { RUN: run(borrowed.delta) } }),
        );
        const payout = await E(seat).getPayout('RUN');
        const amt = await E(runIssuer).getAmountOf(payout);
        t.deepEqual(amt, run(borrowed.delta));
      } else {
        const [runPayment, _rest] = await E(runIssuer).split(
          step1.payouts.RUN,
          run(-borrowed.delta),
        );
        const seat = await E(zoe).offer(
          adjustInvitation,
          harden({
            give: { RUN: run(-borrowed.delta) },
            want: {
              Attestation: AmountMath.makeEmpty(attBrand, AssetKind.SET),
            },
          }),
          harden({ RUN: runPayment }),
        );
        const actual = await E(attIssuer).getAmountOf(
          E(seat).getPayout('Attestation'),
        );
        t.is(actual.brand, attBrand);
      }

      const state = await uiNotifier.getUpdateSince();
      // t.log({ state });
      t.deepEqual(state.value, {
        collateralizationRatio,
        debt: run(borrowed.after),
        locked: AmountMath.make(bld.brand, liened.after),
      });
    };

    if (borrowed.before === 0n) {
      t.is(liened.before, 0n, 'no previous line of credit');
      await testOpen(liened.delta, borrowed.delta);
    } else {
      const step1 = await testOpen(liened.before, borrowed.before);

      if (borrowed.after === 0n) {
        await testClose(step1);
      } else {
        await testAdjust(step1);
      }
    }
  });
};

test('parse test data from spreadsheet', async t => {
  const rows = testCases.ROWS;
  t.deepEqual(rows[0].slice(0, 4), ['', '', '', '']);
  t.deepEqual(rows[1].slice(0, 2), ['Collateralization Ratio', '500%']);
  t.deepEqual(rows[7].slice(0, 4), ['', '', '1', 'Starting LoC']);
});

const makeTestCases = () => {
  const rows = testCases.ROWS;

  /** @type {(s: string) => Rational} */
  const pct = s => [BigInt(s.replace(/[%$.]/g, '')), 100n];
  /** @param { string } label */
  const lookup = label =>
    (rows.find(row => row[0] === label) ||
      assert.fail(X`${label} not found`))[1];
  const price = pct(lookup('BLD Price'));

  rows.forEach(
    ([
      _a,
      _b,
      testNum,
      description,
      _action,
      _runPerBld,
      rateBefore,
      rateAfter,
      runBefore,
      runDelta,
      runAfter,
      staked,
      lienedBefore,
      lienedDelta,
      lienedAfter,
    ]) => {
      if (!staked || !staked.match(/^[0-9]+$/)) return;

      testLoC(price, {
        testNum: Number.parseFloat(testNum),
        description,
        collateralizationRatio: {
          before: pct(rateBefore),
          after: rateAfter.length > 0 ? pct(rateAfter) : undefined,
        },
        borrowed: {
          before: BigInt(runBefore),
          delta: BigInt(runDelta),
          after: BigInt(runAfter),
        },
        staked: BigInt(staked),
        liened: {
          before: BigInt(lienedBefore),
          delta: BigInt(lienedDelta),
          after: BigInt(lienedAfter),
        },
        failOffer: !!description.match(/FAIL/),
      });
    },
  );
};
makeTestCases();

testLoC([125n, 100n], {
  testNum: 0.1,
  description: 'borrow 100 RUN against 6000 BLD at 1.25, 5x',
  borrowed: { before: 0n, delta: 100n, after: 100n },
  staked: 10_000n,
  liened: { before: 0n, delta: 6000n, after: 6000n },
  collateralizationRatio: { before: [5n, 1n] },
});

testLoC([125n, 100n], {
  testNum: 0.2,
  description: 'borrow 151 RUN against 600 BLD at 1.25, 5x',
  borrowed: { before: 0n, delta: 151n, after: 151n },
  liened: { before: 0n, delta: 600n, after: 600n },
  staked: 9_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failOffer: true,
});

testLoC([15n, 100n], {
  testNum: 0.3,
  description: 'borrow 100 RUN against 600 BLD at 0.15, 5x',
  borrowed: { before: 0n, delta: 100n, after: 0n },
  liened: { before: 0n, delta: 600n, after: 600n },
  staked: 9_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failOffer: true,
});

testLoC([125n, 100n], {
  testNum: 0.4,
  description: 'borrow against 6000 BLD without enough staked',
  borrowed: { before: 0n, delta: 100n, after: 0n },
  liened: { before: 0n, delta: 6000n, after: 0n },
  staked: 5_000n,
  collateralizationRatio: { before: [5n, 1n] },
  failAttestation: true,
});

/**
 * @param { StartFaker['publicFacet'] } faker
 * @param { Brand } bldBrand
 * @returns { Promise<[Amount, Payment]> }
 */
const forgeAttestation = async (faker, bldBrand) => {
  const address = 'address1';
  const amountLiened = AmountMath.make(bldBrand, 60_000n);
  return E(faker).fakeAttestation(address, amountLiened);
};

testLoC(
  [125n, 100n],
  {
    testNum: 0.5,
    description: 'forged attestation does not work',
    borrowed: { before: 0n, delta: 100n, after: 0n },
    liened: { before: 0n, delta: 6000n, after: 0n },
    staked: 5_000n,
    collateralizationRatio: { before: [5n, 1n] },
    failOffer: true,
  },
  forgeAttestation,
);
