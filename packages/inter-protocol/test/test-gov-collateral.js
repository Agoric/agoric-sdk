import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import process from 'process';
import url from 'url';
import path from 'path';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
import bundleSource from '@endo/bundle-source';
import {
  addBankAssets,
  makeAddressNameHubs,
  makeOracleBrands,
  makeBoard,
  startPriceAuthority,
} from '@agoric/vats/src/core/basic-behaviors.js';
import centralSupplyBundle from '@agoric/vats/bundles/bundle-centralSupply.js';
import {
  bridgeCoreEval,
  setupClientManager,
} from '@agoric/vats/src/core/chain-behaviors.js';
import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';
import { makeCoreProposalBehavior } from '@agoric/deploy-script-support/src/coreProposalBehavior.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { Stable } from '@agoric/vats/src/tokens.js';
import { makeNodeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';
import { TimeMath } from '@agoric/time';

import { makeScalarBigMapStore } from '@agoric/vat-data';
import {
  setupBootstrap,
  setUpZoeForTest,
  mintRunPayment,
  DENOM_UNIT as UNIT,
} from './supports.js';
import { INVITATION_MAKERS_DESC } from '../src/econCommitteeCharter.js';

/** @template T @typedef {import('@endo/promise-kit').PromiseKit<T>} PromiseKit */

const { Fail } = assert;
const dirname = url.fileURLToPath(new URL('.', import.meta.url));

/** @type {import('ava').TestFn<Awaited<ReturnType<typeof makeTestContext>>>} */
const test = anyTest;

const contractRoots = {
  mintHolder: '../vats/src/mintHolder.js',
  econCommitteeCharter: './src/econCommitteeCharter.js',
};

const coreProposals = {
  addCollateral: '../scripts/add-collateral-core.js',
  startRunPreview: '../scripts/init-core.js',
  inviteCommittee: '../scripts/invite-committee-core.js',
};

const voterAddresses = {
  Rowland: `agoric1qed57ae8k5cqr30u5mmd46jdxfr0juyggxv6ad`,
  Bill: `agoric1xgw4cknedau6xhrlyn6c8e40d02mejee8gwnef`,
  Dan: `agoric1yumvyl7f5nkalss7w59gs6n3jtqv5gmarudx55`,
};

// Nondeterministic, but the test shouldn't rely on this value.
let lastProposalSequence = 0;

const makeTestContext = async () => {
  const bundleCache = await makeNodeBundleCache('bundles/', {}, s => import(s));
  const { zoe, feeMintAccessP, vatAdminSvc, vatAdminState } =
    await setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const install = (src, dest) =>
    bundleCache.load(src, dest).then(b => E(zoe).install(b));
  const installation = {
    mintHolder: install(contractRoots.mintHolder, 'mintHolder'),
    /** @type {Promise<Installation<import('@agoric/vats/src/centralSupply.js').start>>} */
    centralSupply: E(zoe).install(centralSupplyBundle),
    econCommitteeCharter: install(
      contractRoots.econCommitteeCharter,
      'econCommitteeCharter',
    ),
  };

  const bundleNameToAbsolutePaths = new Map();
  const bundlePathToInstallP = new Map();
  const restoreBundleName = bundleName => {
    const absolutePaths = bundleNameToAbsolutePaths.get(bundleName);
    absolutePaths || Fail`bundleName ${bundleName} not found`;
    const { source, bundle } = absolutePaths;
    const bundlePath = bundle || source.replace(/(\\|\/|:)/g, '_');
    if (!bundlePathToInstallP.has(bundlePath)) {
      const match = path.basename(bundlePath).match(/^bundle-(.*)\.js$/);
      const actualBundle = match ? match[1] : bundlePath;
      bundlePathToInstallP.set(bundlePath, install(source, actualBundle));
    }
    return bundlePathToInstallP.get(bundlePath);
  };

  const registerOne = async (bundleName, paths) => {
    !bundleNameToAbsolutePaths.has(bundleName) ||
      Fail`bundleName ${bundleName} already registered`;
    bundleNameToAbsolutePaths.set(bundleName, paths);
    // use vatAdminState to install this bundle
    let bundleP;
    if (paths.bundle) {
      bundleP = import(paths.bundle).then(ns => ns.default);
    } else {
      assert(paths.source);
      bundleP = bundleSource(paths.source);
    }
    const bundle = await bundleP;
    const bundleID = bundle.endoZipBase64Sha512;
    assert(bundleID);
    vatAdminState.installNamedBundle(bundleName, bundleID, bundle);
  };

  const registerBundleHandles = async bundleHandleMap => {
    const allP = [];
    for (const [{ bundleName }, paths] of bundleHandleMap.entries()) {
      allP.push(registerOne(bundleName, paths));
    }
    await Promise.all(allP);
  };

  return {
    registerBundleHandles,
    restoreBundleName,
    cleanups: [],
    zoe: await zoe,
    feeMintAccess: await feeMintAccessP,
    vatAdminSvc,
    vatAdminState,
    run: { issuer: runIssuer, brand: runBrand },
    installation,
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

/**
 * @param {import('ava').ExecutionContext<Awaited<ReturnType<makeTestContext>>>} t
 * @param {{ env?: Record<string, string|undefined> }} [io]
 */
const makeScenario = async (t, { env = process.env } = {}) => {
  const rawSpace = await setupBootstrap(t);
  const vatPowers = t.context.vatAdminState.getVatPowers();
  const space = { vatPowers, ...rawSpace };
  space.produce.vatAdminSvc.resolve(t.context.vatAdminSvc);

  const loadVat = name => {
    const baggage = makeScalarBigMapStore('baggage');
    return import(`@agoric/vats/src/vat-${name}.js`).then(ns =>
      ns.buildRootObject({}, {}, baggage),
    );
  };
  space.produce.loadVat.resolve(loadVat);
  space.produce.loadCriticalVat.resolve(loadVat);

  const emptyRunPayment = async () => {
    const {
      issuer: {
        consume: { [Stable.symbol]: runIssuer },
      },
      brand: {
        consume: { [Stable.symbol]: runBrand },
      },
    } = space;
    return E(E(runIssuer).makeEmptyPurse()).withdraw(
      AmountMath.make(await runBrand, 0n),
    );
  };

  /** @type {PromiseKit<{ mint: ERef<Mint>, issuer: ERef<Issuer>, brand: Brand}>} */
  const ibcKitP = makePromiseKit();

  const startDevNet = async () => {
    // If we don't have a proper bridge manager, we need it to be undefined.
    space.produce.bridgeManager.resolve(undefined);
    space.produce.lienBridge.resolve(undefined);

    /** @type {BankManager} */
    const bankManager = Far('mock BankManager', {
      getAssetSubscription: () => assert.fail('not impl'),
      getModuleAccountAddress: () => assert.fail('not impl'),
      getRewardDistributorDepositFacet: () =>
        Far('depositFacet', {
          receive: () => /** @type {any} */ (null),
        }),
      addAsset: async (denom, keyword, proposedName, kit) => {
        t.log('addAsset', { denom, keyword, issuer: `${kit.issuer}` });
        t.truthy(kit.mint);
        ibcKitP.resolve({ ...kit, mint: kit.mint || assert.fail() });
      },
      getBankForAddress: () => assert.fail('not impl'),
    });
    space.produce.bankManager.resolve(bankManager);

    space.installation.produce.mintHolder.resolve(
      t.context.installation.mintHolder,
    );

    space.produce.initialSupply.resolve(emptyRunPayment());

    return Promise.all([
      // @ts-expect-error TODO: align types better
      addBankAssets(space),
      setupClientManager(space),
      makeAddressNameHubs(space),
      // @ts-expect-error TODO: align types better
      makeBoard(space),
      // @ts-expect-error TODO: align types better
      makeOracleBrands(space),
      // @ts-expect-error TODO: align types better
      bridgeCoreEval(space),
      // @ts-expect-error TODO: align types better
      startPriceAuthority(space),
    ]);
  };

  const provisionMembers = async () => {
    const { zoe } = space.consume;
    const invitationIssuer = await E(zoe).getInvitationIssuer();
    const nameAdmin = await space.consume.namesByAddressAdmin;
    const purses = new Map(
      Object.values(voterAddresses).map(addr => {
        const purse = E(invitationIssuer).makeEmptyPurse();
        return [addr, purse];
      }),
    );
    Object.values(voterAddresses).forEach(addr => {
      const { nameHub, nameAdmin: myAddressNameAdmin } = makeNameHubKit();
      const depositFacet = Far('depositFacet', {
        receive: pmt => {
          const purse = purses.get(addr);
          assert(purse, addr);
          return E(purse).deposit(pmt);
        },
      });
      myAddressNameAdmin.update('depositFacet', depositFacet);
      nameAdmin.update(addr, nameHub, myAddressNameAdmin);
    });
    return purses;
  };

  /** @type {any} */
  const { restoreBundleName: produceRestoreBundleName } = space.produce;
  produceRestoreBundleName.resolve(t.context.restoreBundleName);
  const makeEnactCoreProposalsFromBundleHandle =
    ({ makeCoreProposalArgs, E: cpE }) =>
    async allPowers => {
      const {
        consume: { restoreBundleName },
      } = allPowers;
      const restoreRef = async ({ bundleName }) => {
        return cpE(restoreBundleName)(bundleName);
      };

      await Promise.all(
        makeCoreProposalArgs.map(async ({ ref, call, overrideManifest }) => {
          const subBehavior = makeCoreProposalBehavior({
            manifestBundleRef: ref,
            getManifestCall: call,
            overrideManifest,
            E: cpE,
            restoreRef,
          });
          await subBehavior(allPowers);
        }),
      );
    };

  /**
   * @param {string[]} proposals
   */
  const evalProposals = async proposals => {
    const { code, bundleHandleToAbsolutePaths } =
      await extractCoreProposalBundles(
        proposals,
        dirname,
        makeEnactCoreProposalsFromBundleHandle,
        () => (lastProposalSequence += 1),
      );
    await t.context.registerBundleHandles(bundleHandleToAbsolutePaths);

    const coreEvalMessage = {
      type: 'CORE_EVAL',
      evals: [
        {
          json_permits: 'true',
          js_code: code,
        },
      ],
    };

    /** @type {any} */
    const { coreEvalBridgeHandler } = space.consume;
    await E(coreEvalBridgeHandler).fromBridge(coreEvalMessage);
  };

  const startRunPreview = async () => {
    const { brand: atomBrand } = makeIssuerKit(
      'ATOM',
      undefined,
      harden({ decimalPlaces: 6 }),
    );
    env.MIN_INITIAL_POOL_LIQUIDITY = '0';
    await Promise.all([
      E(E(space.consume.agoricNamesAdmin).lookupAdmin('oracleBrand')).update(
        'ATOM',
        atomBrand,
      ),
      evalProposals([coreProposals.startRunPreview]),
    ]);
  };

  /** @type {PromiseKit<string>} */
  const atomIssuerPK = makePromiseKit();

  const enactVaultAssetProposal = async () => {
    env.INTERCHAIN_DENOM = 'ibc/abc123';
    await evalProposals([coreProposals.addCollateral]);
  };

  const enactInviteEconCommitteeProposal = async () => {
    env.ECON_COMMITTEE_ADDRESSES = JSON.stringify(voterAddresses);
    await evalProposals([coreProposals.inviteCommittee]);
  };

  /**
   * @param {{
   *   agoricNames: ERef<NameHub>,
   *   board: ERef<import('@agoric/vats').Board>,
   *   zoe: ERef<ZoeService>,
   *   wallet: {
   *     purses: {
   *       ist: ERef<Purse>,
   *       atom: ERef<Purse>,
   *     },
   *   },
   * }} home
   */
  const makeBenefactor = home => {
    const {
      agoricNames,
      board,
      zoe,
      wallet: { purses },
    } = home;

    return Far('benefactor', {
      // This isn't used now that we make the pool from a denom
      // in publishInterchainAssetFromBank in addAssetToVault.js
      // But it should still work. TODO: Perhaps we should test both ways?
      // i.e. from a board ID as well?
      makePool: async (atomQty = 500n, istQty = 1000n) => {
        const istBrand = await E(agoricNames).lookup('brand', 'RUN');
        const istAmt = qty => AmountMath.make(istBrand, qty * UNIT);
        const interchainPoolAPI = E(zoe).getPublicFacet(
          E(agoricNames).lookup('instance', 'interchainPool'),
        );

        const proposal1 = harden({ give: { Central: istAmt(istQty) } });
        const centralPmt = await E(purses.ist).withdraw(proposal1.give.Central);
        const inv1 = await E(interchainPoolAPI).makeInterchainPoolInvitation();
        const seat1 = await E(zoe).offer(
          inv1,
          proposal1,
          harden({ Central: centralPmt }),
          harden({ denom: 'ibc/abc123' }),
        );
        const { invitation: inv2, issuer: ibcIssuer } = await E(
          seat1,
        ).getOfferResult();
        atomIssuerPK.resolve(E(board).getId(ibcIssuer));
        const ibcBrand = await E(ibcIssuer).getBrand();
        const atomAmt = qty => AmountMath.make(ibcBrand, qty * UNIT);

        const proposal2 = harden({ give: { Secondary: atomAmt(atomQty) } });
        const pmt2 = await E(purses.atom).withdraw(proposal2.give.Secondary);
        const seat2 = await E(zoe).offer(
          inv2,
          proposal2,
          harden({ Secondary: pmt2 }),
        );
        t.deepEqual(await E(seat2).getOfferResult(), 'Added liquidity.');
      },

      depositInReserve: async (qty = 10_000n) => {
        const ibcAtomBrand = await E(agoricNames).lookup('brand', 'IbcATOM');
        /** @type {ERef<import('../src/reserve/assetReserve').AssetReservePublicFacet>} */
        const reserveAPI = E(zoe).getPublicFacet(
          E(agoricNames).lookup('instance', 'reserve'),
        );

        const proposal = harden({
          give: { Collateral: AmountMath.make(ibcAtomBrand, qty * UNIT) },
        });
        const atom10k = await E(purses.atom).withdraw(proposal.give.Collateral);
        const seat = E(zoe).offer(
          await E(reserveAPI).makeAddCollateralInvitation(),
          proposal,
          harden({ Collateral: atom10k }),
        );
        return E(seat).getOfferResult();
      },
    });
  };

  const { agoricNames, zoe, board } = space.consume;
  const makeRunPurse = async value => {
    /** @type {Promise<Issuer<'nat'>>} */
    const issuerP = E(agoricNames).lookup('issuer', 'IST');
    const purseP = E(issuerP).makeEmptyPurse();
    return mintRunPayment(value, {
      centralSupply: t.context.installation.centralSupply,
      feeMintAccess: t.context.feeMintAccess,
      zoe,
    }).then(pmt =>
      E(purseP)
        .deposit(pmt)
        .then(_ => purseP),
    );
  };
  const makeAtomPurse = async value => {
    // when using benefactor.makePool:
    // const { issuer, mint, brand } = await ibcKitP.promise;
    const { bankMints } = space.consume;
    const mint = E.get(bankMints)[0];
    const issuer = E(mint).getIssuer();
    const purseP = E(issuer).makeEmptyPurse();
    const brand = await E(issuer).getBrand();
    const pmt = await E(mint).mintPayment(AmountMath.make(brand, value));
    await E(purseP).deposit(pmt);
    return purseP;
  };
  const purses = {
    ist: makeRunPurse(10_000n * UNIT),
    atom: makeAtomPurse(10_000n * UNIT),
  };

  return {
    startDevNet,
    provisionMembers,
    startRunPreview,
    enactVaultAssetProposal,
    enactInviteEconCommitteeProposal,
    benefactor: makeBenefactor({ agoricNames, board, zoe, wallet: { purses } }),
    space,
  };
};

test('Benefactor can add to reserve', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  await s.provisionMembers();
  await s.startRunPreview();
  // await s.benefactor.makePool(2000n, 1000n);
  await Promise.all([
    s.enactVaultAssetProposal(),
    s.enactInviteEconCommitteeProposal(),
  ]);

  const result = await s.benefactor.depositInReserve(4000n);
  t.deepEqual(result, 'added Collateral to the Reserve');
});

test('voters get invitations', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  const purses = await s.provisionMembers();
  await s.startRunPreview();
  // await s.benefactor.makePool();
  await Promise.all([
    s.enactVaultAssetProposal(),
    s.enactInviteEconCommitteeProposal(),
  ]);

  t.is(purses.size, 3);
  await Promise.all(
    [...purses].map(async ([_addr, purse]) => {
      const amt = await E(purse).getCurrentAmount();
      const value = amt.value;
      assert(Array.isArray(value));

      const instanceInv = value.find(
        ({ description }) => description === INVITATION_MAKERS_DESC,
      );
      t.assert(instanceInv);

      const voterInv = value.find(({ description }) =>
        description.startsWith('Voter'),
      );
      t.assert(voterInv);
      t.not(instanceInv, voterInv);
    }),
  );
});

test('assets are in AMM, Vaults', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  await s.provisionMembers();
  await s.startRunPreview();
  // await s.benefactor.makePool(2000n, 1000n);

  await Promise.all([
    s.enactVaultAssetProposal(),
    s.enactInviteEconCommitteeProposal(),
  ]);

  const {
    consume: { zoe, agoricNames },
    instance: { consume: instanceP },
  } = s.space;
  const brand = await E(agoricNames).lookup('brand', 'IbcATOM');
  const runBrand = await E(agoricNames).lookup('brand', Stable.symbol);

  /** @type { ERef<XYKAMMPublicFacet> } */
  const ammAPI = instanceP.amm.then(i => E(zoe).getPublicFacet(i));
  const ammStuff = await E(ammAPI).getAllPoolBrands();
  t.deepEqual(ammStuff, [brand]);

  /** @type {ERef<import('../src/vaultFactory/vaultFactory').VaultFactoryContract['publicFacet']>} */
  const vaultsAPI = instanceP.VaultFactory.then(i => E(zoe).getPublicFacet(i));

  const params = await E(vaultsAPI).getGovernedParams({
    collateralBrand: brand,
  });
  t.deepEqual(params.DebtLimit, {
    type: 'amount',
    // 1000 IST is the default debtLimitValue in add-collateral-core
    value: { brand: runBrand, value: 1_000n * UNIT },
  });
});

test('Committee can raise debt limit', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  const invitationPurses = await s.provisionMembers();
  await s.startRunPreview();
  // await s.benefactor.makePool(2000n, 1000n);

  await Promise.all([
    s.enactVaultAssetProposal(),
    s.enactInviteEconCommitteeProposal(),
  ]);

  const { agoricNames } = s.space.consume;
  const brand = await E(agoricNames).lookup('brand', 'IbcATOM');
  const runBrand = await E(agoricNames).lookup('brand', Stable.symbol);
  const vaultsInstance = await E(agoricNames).lookup(
    'instance',
    'VaultFactory',
  );
  const economicCommittee = await E(agoricNames).lookup(
    'instance',
    'economicCommittee',
  );

  const { zoe } = s.space.consume;
  t.log({ purses: invitationPurses });

  const billsInvitationPurse = invitationPurses.get(voterAddresses.Bill);
  assert(billsInvitationPurse);

  const invitationsAmt = await E(billsInvitationPurse).getCurrentAmount();
  t.log('amt.value', invitationsAmt.value);

  const charterInvDetail = /** @type {SetValue} */ (invitationsAmt.value).find(
    ({ description }) => description === INVITATION_MAKERS_DESC,
  );
  t.assert(charterInvDetail);

  const charterInv = await E(billsInvitationPurse).withdraw(
    AmountMath.make(invitationsAmt.brand, harden([charterInvDetail])),
  );
  const charterInvitationMakers = await E.get(
    E(E(zoe).offer(charterInv)).getOfferResult(),
  ).invitationMakers;

  const params = { DebtLimit: AmountMath.make(runBrand, 100n) };

  // We happen to know how the timer is implemented.
  /** @type { ERef<ManualTimer> } */
  const timer = /** @type {any } */ (s.space.consume.chainTimerService);

  const now = await E(timer).getCurrentTimestamp();
  const deadline = TimeMath.addAbsRel(now, 3n);
  const startVotingSeat = E(zoe).offer(
    await E(charterInvitationMakers).VoteOnParamChange(),
    undefined,
    undefined,
    {
      params,
      instance: vaultsInstance,
      deadline,
      path: { paramPath: { key: { collateralBrand: brand } } },
    },
  );
  await E(startVotingSeat).getOfferResult();
  await E(startVotingSeat).getPayouts();

  /** @type {ERef<CommitteeElectoratePublic>} */
  const committeePublic = E(zoe).getPublicFacet(economicCommittee);
  const questions = await E(committeePublic).getOpenQuestions();
  t.log({ questions });
  t.true(questions.length > 0, 'question is open');
  const question = E(committeePublic).getQuestion(questions[0]);
  const { positions, questionHandle, counterInstance } = await E(
    question,
  ).getDetails();

  await Promise.all(
    [...invitationPurses.values()].map(async p => {
      const amt2 = await E(p).getCurrentAmount();

      const item = /** @type {SetValue} */ (amt2.value).find(
        ({ description }) => description.startsWith('Voter'),
      );
      const inv = await E(p).withdraw(
        AmountMath.make(amt2.brand, harden([item])),
      );
      t.log({ inv });
      const seat = await E(zoe).offer(inv);
      t.log({ seat });
      const { voter } = await E(seat).getOfferResult();
      t.log({ voter });
      return E(voter).castBallotFor(questionHandle, [positions[0]]);
    }),
  );

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  const count = E(zoe).getPublicFacet(counterInstance);
  const outcome = await E(count).getOutcome();
  t.deepEqual(outcome, {
    changes: { DebtLimit: { brand: runBrand, value: 100n } },
  });
});

// https://github.com/endojs/endo/issues/647
// test.todo('users can open vaults');
