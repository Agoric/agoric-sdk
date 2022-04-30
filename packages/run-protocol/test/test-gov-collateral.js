// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { readFile } from 'fs/promises';
import { E, Far } from '@endo/far';
import {
  addBankAssets,
  makeAddressNameHubs,
  startPriceAuthority,
} from '@agoric/vats/src/core/basic-behaviors.js';
import {
  bridgeCoreEval,
  makeClientManager,
} from '@agoric/vats/src/core/chain-behaviors.js';
import { buildRootObject as bankRoot } from '@agoric/vats/src/vat-bank.js';
import { buildRootObject as priceAuthorityRoot } from '@agoric/vats/src/vat-priceAuthority.js';
import { defangAndTrim } from '@agoric/deploy-script-support/src/code-gen.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import {
  setupAmm,
  setupReserve,
  startEconomicCommittee,
  startVaultFactory,
} from '../src/econ-behaviors.js';
import { makeNodeBundleCache } from './bundleTool.js';
import {
  installGovernance,
  setupBootstrap,
  setUpZoeForTest,
} from './supports.js';
import {
  addAssetToVault,
  addInterchainAsset,
  registerScaledPriceAuthority,
} from '../src/vaultFactory/addAssetToVault.js';

const asset = path => readFile(path, 'utf-8');

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

const vatRoots = {
  bank: bankRoot,
  priceAuthority: priceAuthorityRoot,
};

const contractRoots = {
  liquidate: './src/vaultFactory/liquidateMinimum.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
  reserve: './src/reserve/assetReserve.js',
  mintHolder: '../vats/src/mintHolder.js',
  voting: './src/voting.js',
};

const govScript = {
  inviteCommittee: './scripts/gov-inviteCommittee.js',
};

const voterAddresses = {
  Rowland: `agoric1qed57ae8k5cqr30u5mmd46jdxfr0juyggxv6ad`,
  Bill: `agoric1xgw4cknedau6xhrlyn6c8e40d02mejee8gwnef`,
  Dan: `agoric1yumvyl7f5nkalss7w59gs6n3jtqv5gmarudx55`,
};

const makeTestContext = async () => {
  const bundleCache = await makeNodeBundleCache('bundles/', s => import(s));
  const { zoe, feeMintAccess } = setUpZoeForTest();

  const runIssuer = await E(zoe).getFeeIssuer();
  const runBrand = await E(runIssuer).getBrand();

  const install = (src, dest) =>
    bundleCache.load(src, dest).then(b => E(zoe).install(b));
  const installation = {
    liquidate: install(contractRoots.liquidate, 'liquidateMinimum'),
    VaultFactory: install(contractRoots.VaultFactory, 'VaultFactory'),
    amm: install(contractRoots.amm, 'amm'),
    reserve: install(contractRoots.reserve, 'reserve'),
    mintHolder: install(contractRoots.mintHolder, 'mintHolder'),
    voting: install(contractRoots.voting, 'voting'),
  };

  return {
    zoe: await zoe,
    feeMintAccess: await feeMintAccess,
    runKit: { brand: runBrand, issuer: runIssuer },
    installation,
    govScript: {
      inviteCommittee: await asset(govScript.inviteCommittee),
    },
  };
};

test.before(async t => {
  t.context = await makeTestContext();
});

const makeScenario = async t => {
  const space = await setupBootstrap(t);

  const loadVat = name => {
    switch (name) {
      case 'priceAuthority':
        return vatRoots.priceAuthority();
      case 'bank':
        return vatRoots.bank();
      default:
        throw Error(`not implemented ${name}`);
    }
  };
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

  const startDevNet = async () => {
    let handler;
    const bridgeManager = {
      toBridge: () => {},
      register: (name, fn) => {
        handler = fn;
      },
      unregister: () => {},
    };
    space.produce.bridgeManager.resolve(bridgeManager);

    space.installation.produce.mintHolder.resolve(
      t.context.installation.mintHolder,
    );

    space.produce.initialSupply.resolve(emptyRunPayment());

    return Promise.all([
      // @ts-expect-error TODO: align types better
      addBankAssets(space),
      // @ts-expect-error TODO: align types better
      makeClientManager(space),
      // @ts-expect-error TODO: align types better
      makeAddressNameHubs(space),
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
      nameAdmin.update(addr, nameHub);
    });
    return purses;
  };

  const startRunPreview = async () => {
    const {
      installation: { produce: iProduce },
    } = space;
    iProduce.VaultFactory.resolve(t.context.installation.VaultFactory);
    iProduce.liquidate.resolve(t.context.installation.liquidate);
    iProduce.amm.resolve(t.context.installation.amm);
    iProduce.reserve.resolve(t.context.installation.reserve);

    const USD = makeIssuerKit('USD');
    const ATOM = makeIssuerKit('ATOM');
    space.oracleBrand.produce.USD.resolve(USD.brand);

    await Promise.all([
      E(E(space.consume.agoricNamesAdmin).lookupAdmin('oracleBrand')).update(
        'ATOM',
        ATOM.brand,
      ),
      installGovernance(space.consume.zoe, space.installation.produce),
      startEconomicCommittee(space),
      setupAmm(space),
      startVaultFactory(space),
      setupReserve(space),
    ]);
  };

  const enactProposal = async () => {
    E(E(space.consume.agoricNamesAdmin).lookupAdmin('installation')).update(
      'voting',
      t.context.installation.voting,
    ); // kludge

    // Start the governance from the core proposals.
    const coreEvalMessage = {
      type: 'CORE_EVAL',
      evals: [
        {
          json_permits: 'true',
          js_code: defangAndTrim(t.context.govScript.inviteCommittee),
        },
      ],
    };
    /** @type {any} */
    const { coreEvalBridgeHandler } = space.consume;
    await E(coreEvalBridgeHandler).fromBridge(
      'arbitrary srcID',
      coreEvalMessage,
    );

    // TODO: integrate with writeCoreProposal or whatever
    await Promise.all([
      addInterchainAsset(space, { options: { denom: 'ibc/abc123' } }),
      registerScaledPriceAuthority(space),
      addAssetToVault(space),
    ]);
  };

  const benefactorDeposit = async (qty = 10_000n) => {
    const { ibcAtomMintForTesting, agoricNames, zoe } = space.consume;
    const ibcAtomBrand = await E(agoricNames).lookup('brand', 'IbcATOM');
    /** @type {ERef<import('../src/reserve/assetReserve').AssetReservePublicFacet>} */
    const reserveAPI = E(zoe).getPublicFacet(
      E(agoricNames).lookup('instance', 'reserve'),
    );
    const proposal = harden({
      give: { Collateral: AmountMath.make(ibcAtomBrand, qty * 1_000_000n) },
    });

    const atom10k = await E(ibcAtomMintForTesting).mintPayment(
      proposal.give.Collateral,
    );
    const seat = E(zoe).offer(
      await E(reserveAPI).makeAddCollateralInvitation(),
      proposal,
      harden({ Collateral: atom10k }),
    );
    return E(seat).getOfferResult();
  };

  return {
    startDevNet,
    provisionMembers,
    startRunPreview,
    enactProposal,
    benefactorDeposit,
    space,
  };
};

test('Benefactor can add to reserve', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  await s.provisionMembers();
  await s.startRunPreview();
  await s.enactProposal();
  const result = await s.benefactorDeposit();
  t.deepEqual(result, 'added Collateral to the Reserve');
});

test('voters get invitations', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  const purses = await s.provisionMembers();
  await s.startRunPreview();

  await s.enactProposal();

  t.is(purses.size, 3);
  await Promise.all(
    [...purses].map(async ([_addr, purse]) => {
      const amt = await E(purse).getCurrentAmount();
      t.deepEqual(
        amt.value[0].description,
        'identifies the voting contract instance',
      );
      t.true(amt.value[1].description.startsWith('Voter'));
    }),
  );
});

test('assets are in AMM, Vaults', async t => {
  const s = await makeScenario(t);
  await s.startDevNet();
  await s.provisionMembers();
  await s.startRunPreview();

  await s.enactProposal();

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

  await s.enactProposal();

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
    ({ description }) =>
      description === 'identifies the voting contract instance',
  );
  t.assert(votingInv);

  const pf = await E(zoe).getPublicFacet(votingInv.instance);
  const params = { DebtLimit: AmountMath.make(runBrand, 100n) };
  const deadline = 1232n;
  const actual = await E(pf).voteOnVaultParamChanges(
    params,
    {
      collateralBrand: brand,
    },
    deadline,
  );

  t.log('@@@ continue testing here');
  t.deepEqual(actual, {
    details: actual.details,
    instance: votingInv.instance,
    outcomeOfUpdate: actual.outcomeOfUpdate,
  });
});

// test.todo('users can open vaults');
