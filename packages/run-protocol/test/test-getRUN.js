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
  bootstrapRunLoC,
  startEconomicCommittee,
  startGetRun,
} from '../src/econ-behaviors.js';
import * as Collect from '../src/collect.js';
import * as testCases from './runLoC-test-case-sheet.js';
import { setupAMMBootstrap } from './amm/vpool-xyk-amm/setup.js';

const contractRoots = {
  getRUN: '../src/getRUN.js',
  electorate: '@agoric/governance/src/noActionElectorate.js',
  governor: '@agoric/governance/src/contractGovernor.js',
  faker: './attestationFaker.js',
};

const { assign, entries, fromEntries, keys } = Object;
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

test('RUN mint access', async t => {
  assert.typeof(t.context, 'object');
  assert(t.context);

  const { zoe, feeMintAccess } = await bootstrapZoeAndRun();
  t.truthy(zoe);
  t.truthy(feeMintAccess);
});

/**
 * Note: caller must produce client.
 *
 * @param {*} t
 */
const bootstrapGetRun = async t => {
  const bundles = theBundles(t);
  const timer = buildManualTimer(t.log, 0n, 1n);
  const { zoe, feeMintAccess, runBrand, bld } = await bootstrapZoeAndRun();
  const runIssuer = E(zoe).getFeeIssuer();

  const chain = mockChain({ addr1a: 1_000_000_000n * micro.unit });
  const lienBridge = chain.makeLienBridge(bld.brand);

  const space = await setupAMMBootstrap(timer, zoe);
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
    assignBundle: fns => {
      t.log('assignBundle:', fns);
    },
  });
  produce.client.resolve(mockClient);

  await Promise.all([
    // @ts-ignore TODO: resolve this type
    startEconomicCommittee(space),
    startGetRun(space),
  ]);
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
  const { chain, space } = await bootstrapGetRun(t);
  const { consume } = space;
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

/** @type {[string, unknown][]} */
const td1 = [
  // 1	Starting LoC
  [`buyBLD`, 10_000n],
  [`stakeBLD`, 3_000n],
  [`lienBLD`, 2_000n],
  [`borrowRUN`, 100n],
  [`checkRUNDebt`, 100n],
  [`checkBLDLiened`, 2_000n],

  // 2	Extending LoC
  [`checkRUNBalance`, 100n],
  [`borrowMoreRUN`, 100n],
  [`checkRUNDebt`, 200n],
  [`checkRUNBalance`, 200n],

  // 3	Extending LoC - more BLD required
  [`stakeBLD`, 5_000n],
  [`checkBLDStaked`, 8_000n],
  [`lienBLD`, 8_000n],
  [`checkBLDLiened`, 8_000n],
  [`borrowMoreRUN`, 1_400n],
  [`checkRUNDebt`, 1_600n],
];

test('data driven', async t => {
  const { chain, space } = await bootstrapGetRun(t);
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

  const founder = chain.provisionAccount('founder', 'addr1a');
  const bob = chain.provisionAccount('Bob', 'addr1b');

  const attIssuer = E(getRUN.publicFacet).getIssuer();
  const walletMaker = makeWalletMaker(getRUN.creatorFacet);

  // Bob introduces himself to the Agoric JS VM.
  const bobWallet = walletMaker(bob.getAddress());

  const attPurse = E(attIssuer).makeEmptyPurse();
  const runPurse = E(runIssuer).makeEmptyPurse();
  let offerResult;
  const driver = harden({
    // setRate: ratePK.resolve,
    // setPrice: pricePK.resolve,
    buyBLD: n => founder.sendTo(bob.getAddress(), n * micro.unit),
    stakeBLD: n => bob.stake(n * micro.unit),
    lienBLD: async target => {
      const current = await E(lienBridge).getAccountState(
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
    checkBLDStaked: async expected => {
      const actual = await E(lienBridge).getAccountState(
        bob.getAddress(),
        bldBrand,
      );
      t.deepEqual(
        actual.bonded,
        AmountMath.make(bldBrand, expected * micro.unit),
      );
    },
    checkBLDLiened: async expected => {
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
      E(runPurse).deposit(runPmt);
    },
    checkRUNBalance: async target => {
      const actual = await E(runPurse).getCurrentAmount();
      t.deepEqual(actual, AmountMath.make(runBrand, target * micro.unit));
    },
    checkRUNDebt: async value => {
      const { uiNotifier } = offerResult;
      const state = await uiNotifier.getUpdateSince();
      t.deepEqual(
        state.value.debt,
        AmountMath.make(runBrand, value * micro.unit),
      );
    },
  });
  for await (const [tag, value] of td1) {
    t.log([tag, value]);
    const fn = driver[tag];
    if (!fn) {
      throw Error(`bad tag: ${tag}`);
    }
    await fn(value);
  }
});

// test.skip('attestation facets@@@', async t => {
//   const { zoe } = await bootstrapZoeAndRun();
//   const micro = harden({ decimalPlaces: 6 });
//   const { mint: _, ...bld } = makeIssuerKit('BLD', AssetKind.NAT, micro);

//   const { attestation: bundle } = theBundles(t);
//   const { issuer, brand, creatorFacet } = await bootstrapAttestation(
//     bundle,
//     zoe,
//     bld.issuer,
//     mockBridge(bld.brand),
//     { expiringAttName: 'BldAttGov', returnableAttName: 'BldAttLoC' },
//   );

//   const attMaker = E(creatorFacet).getAttMaker('agoric3k');
//   const expiration = 120n;
//   const amountLiened = AmountMath.make(bld.brand, 5n);
//   const pmt = E.get(E(attMaker).makeAttestations(amountLiened, expiration))
//     .returnable;
//   const amt = await E(issuer).getAmountOf(pmt);
//   t.deepEqual(amt, {
//     brand,
//     value: [{ address: 'agoric3k', amountLiened }],
//   });
// });

/**
 * @typedef { import('@agoric/eventual-send').Unpromise<T> } Unpromise<T>
 * @template T
 */

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
 * @param { (faker: ERef<StartFaker['publicFacet']>, bldBrand: Brand)
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

    // start RUN LoC
    const collateralPrice = makeRatio(price[0], runBrand, price[1], bld.brand);
    const rate = cr.before;
    const collateralizationRatio = makeRatio(rate[0], runBrand, rate[1]);
    const timer = buildManualTimer(t.log, 0n, 1n);

    const installations = await Collect.allValues({
      governor: E(zoe).install(bundles.governor),
      electorate: E(zoe).install(bundles.electorate),
      getRUN: E(zoe).install(bundles.getRUN),
    });

    const { publicFacet, creatorFacet } = await bootstrapRunLoC(
      zoe,
      timer,
      feeMintAccess,
      installations,
      { collateralPrice, collateralizationRatio },
      bld.issuer,
      mockChain(bld.brand).authority,
    );
    const attIssuer = await E(publicFacet).getIssuer();
    const attBrand = await E(attIssuer).getBrand();

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
    // @ts-ignore threading types thru governance is tricky.
    const attMaker = E(creatorFacet).getAttMaker(addrFromStake);

    // @ts-ignore governance wrapper obscures publicFace type :-/
    const lineOfCreditInvitation = await E(publicFacet).makeLoanInvitation();

    /**
     * @param {bigint} bldValue
     * @param {bigint} runValue
     */
    const testOpen = async (bldValue, runValue) => {
      const tryAttestation = E(attMaker).makeAttestation(ubld(bldValue));
      if (failAttestation) {
        await t.throwsAsync(tryAttestation);
        return undefined;
      }
      /** @returns { Promise<[Amount, Payment]> } */
      const getReturnableAttestation = () =>
        tryAttestation.then(pmt =>
          E(attIssuer)
            .getAmountOf(pmt)
            .then(amt => [amt, pmt]),
        );
      const fakerInstallation = E(zoe).install(bundles.faker);
      const [attAmt, attPmt] = await (mockAttestation
        ? mockAttestation(
            E.get(E(zoe).startInstance(fakerInstallation)).publicFacet,
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
            Attestation: AmountMath.makeEmpty(attBrand, AssetKind.COPY_BAG),
          },
        }),
        harden({ RUN: payouts.RUN }),
      );
      t.deepEqual(await E(seat).getOfferResult(), 'RUN line of credit closed');
      const attBack = await E(seat).getPayout('Attestation');
      const amt = await E(attIssuer).getAmountOf(attBack);
      t.deepEqual(amt, {
        brand: attBrand,
        value: makeCopyBag([[addrFromStake, liened.before]]),
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
              Attestation: AmountMath.makeEmpty(attBrand, AssetKind.COPY_BAG),
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
