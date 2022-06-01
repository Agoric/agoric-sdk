// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import process from 'process';
import url from 'url';
import path from 'path';
import { E, Far } from '@endo/far';
import { makePromiseKit } from '@endo/promise-kit';
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
  makeClientManager,
} from '@agoric/vats/src/core/chain-behaviors.js';
import { extractCoreProposalBundles } from '@agoric/deploy-script-support/src/extract-proposal.js';
import { makeCoreProposalBehavior } from '@agoric/deploy-script-support/src/coreProposalBehavior.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeNodeBundleCache } from './bundleTool.js';
import { setupBootstrap, setUpZoeForTest, mintRunPayment } from './supports.js';

/** @template T @typedef {import('@endo/promise-kit').PromiseKit<T>} PromiseKit */

const { details: X } = assert;
const dirname = url.fileURLToPath(new URL('.', import.meta.url));

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
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
  const bundleCache = await makeNodeBundleCache('bundles/', s => import(s));
  const { zoe, feeMintAccess } = await setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const install = (src, dest) =>
    bundleCache.load(src, dest).then(b => E(zoe).install(b));
  const installation = {
    mintHolder: install(contractRoots.mintHolder, 'mintHolder'),
    centralSupply: E(zoe).install(centralSupplyBundle),
    econCommitteeCharter: install(
      contractRoots.econCommitteeCharter,
      'econCommitteeCharter',
    ),
  };

  const bundleIDToAbsolutePaths = new Map();
  const bundlePathToInstallP = new Map();
  const restoreBundleID = bundleID => {
    const absolutePaths = bundleIDToAbsolutePaths.get(bundleID);
    assert(absolutePaths, X`bundleID ${bundleID} not found`);
    const { source, bundle } = absolutePaths;
    const bundlePath = bundle || source.replace(/(\\|\/|:)/g, '_');
    if (!bundlePathToInstallP.has(bundlePath)) {
      const match = path.basename(bundlePath).match(/^bundle-(.*)\.js$/);
      const actualBundle = match ? match[1] : bundlePath;
      bundlePathToInstallP.set(bundlePath, install(source, actualBundle));
    }
    return bundlePathToInstallP.get(bundlePath);
  };

  const registerBundleHandles = bundleHandleMap => {
    for (const [{ bundleID }, paths] of bundleHandleMap.entries()) {
      assert(
        !bundleIDToAbsolutePaths.has(bundleID),
        X`bundleID ${bundleID} already registered`,
      );
      bundleIDToAbsolutePaths.set(bundleID, paths);
    }
  };

  return {
    registerBundleHandles,
    restoreBundleID,
    cleanups: [],
    zoe: await zoe,
    feeMintAccess: await feeMintAccess,
    runKit: { brand: runBrand, issuer: runIssuer },
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
  const space = await setupBootstrap(t);

  const loadVat = name =>
    import(`@agoric/vats/src/vat-${name}.js`).then(ns => ns.buildRootObject());
  space.produce.loadVat.resolve(loadVat);

  const emptyRunPayment = async () => {
    const {
      issuer: {
        consume: { RUN: runIssuer },
      },
      brand: {
        consume: { RUN: runBrand },
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

    /** @type {Awaited<BankManager>} */
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
      makeClientManager(space),
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
  const { restoreBundleID: produceRestoreBundleID } = space.produce;
  produceRestoreBundleID.resolve(t.context.restoreBundleID);
  const makeEnactCoreProposalsFromBundleHandle =
    ({ makeCoreProposalArgs, E: cpE }) =>
    async allPowers => {
      const {
        consume: { restoreBundleID },
      } = allPowers;
      const restoreRef = async ({ bundleID }) => {
        return cpE(restoreBundleID)(bundleID);
      };

      await Promise.all(
        makeCoreProposalArgs.map(async ({ ref, call, overrideManifest }) => {
          const subBehavior = makeCoreProposalBehavior({
            manifestInstallRef: ref,
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
    t.context.registerBundleHandles(bundleHandleToAbsolutePaths);

    console.log(bundleHandleToAbsolutePaths, code);

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
    await E(coreEvalBridgeHandler).fromBridge(
      'arbitrary srcID',
      coreEvalMessage,
    );
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
   *   board: ERef<Board>,
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
        const istAmt = qty => AmountMath.make(istBrand, qty * 1_000_000n);
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
        const atomAmt = qty => AmountMath.make(ibcBrand, qty * 1_000_000n);

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
          give: { Collateral: AmountMath.make(ibcAtomBrand, qty * 1_000_000n) },
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
    const issuerP = E(agoricNames).lookup('issuer', 'RUN');
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
    ist: makeRunPurse(10_000n * 1_000_000n),
    atom: makeAtomPurse(10_000n * 1_000_000n),
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
        ({ description }) => description === 'econCommitteeCharter noop',
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
  const runBrand = await E(agoricNames).lookup('brand', 'RUN');

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
    value: { brand: runBrand, value: 0n },
  });
});

test('Committee can raise debt limit', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  const purses = await s.provisionMembers();
  await s.startRunPreview();
  // await s.benefactor.makePool(2000n, 1000n);

  await Promise.all([
    s.enactVaultAssetProposal(),
    s.enactInviteEconCommitteeProposal(),
  ]);

  const { agoricNames } = s.space.consume;
  const brand = await E(agoricNames).lookup('brand', 'IbcATOM');
  const runBrand = await E(agoricNames).lookup('brand', 'RUN');

  const { zoe } = s.space.consume;
  t.log({ purses });

  const billsPurse = purses.get(voterAddresses.Bill);
  assert(billsPurse);

  const amt = await E(billsPurse).getCurrentAmount();
  t.log('amt.value', amt.value);

  const votingInv = /** @type {SetValue} */ (amt.value).find(
    ({ description }) => description === 'econCommitteeCharter noop',
  );
  t.assert(votingInv);

  const pf = await E(zoe).getPublicFacet(votingInv.instance);
  const params = { DebtLimit: AmountMath.make(runBrand, 100n) };

  // We happen to know how the timer is implemented.
  /** @type { ERef<ManualTimer> } */
  const timer = /** @type {any } */ (s.space.consume.chainTimerService);

  const now = await E(timer).getCurrentTimestamp();
  const deadline = now + 3n;
  const actual = await E(pf).voteOnVaultParamChanges(
    params,
    {
      collateralBrand: brand,
    },
    deadline,
  );

  t.deepEqual(actual, {
    details: actual.details,
    instance: votingInv.instance,
    outcomeOfUpdate: actual.outcomeOfUpdate,
  });

  const { questionHandle, positions } = await actual.details;
  await Promise.all(
    [...purses.values()].map(async p => {
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
      const voteFacet = await E(seat).getOfferResult();
      t.log({ voteFacet });
      return E(voteFacet).castBallotFor(questionHandle, [positions[0]]);
    }),
  );

  await E(timer).tick();
  await E(timer).tick();
  await E(timer).tick();

  const count = E(zoe).getPublicFacet(actual.instance);
  const outcome = await E(count).getOutcome();
  t.deepEqual(outcome, {
    changes: { DebtLimit: { brand: runBrand, value: 100n } },
  });
});

// test.todo('users can open vaults');
