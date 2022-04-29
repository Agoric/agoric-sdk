// @ts-check
import { test as anyTest } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { readFile } from 'fs/promises';
import { E, Far } from '@endo/far';
import {
  makeAddressNameHubs,
  startPriceAuthority,
} from '@agoric/vats/src/core/basic-behaviors.js';
import {
  bridgeCoreEval,
  makeClientManager,
} from '@agoric/vats/src/core/chain-behaviors.js';
import { buildRootObject as priceAuthorityRoot } from '@agoric/vats/src/vat-priceAuthority.js';
import { defangAndTrim } from '@agoric/deploy-script-support/src/code-gen.js';
import { makeNameHubKit } from '@agoric/vats/src/nameHub.js';
import {
  setupAmm,
  startEconomicCommittee,
  startVaultFactory,
} from '../src/econ-behaviors.js';
import { makeNodeBundleCache } from './bundleTool.js';
import {
  installGovernance,
  setupBootstrap,
  setUpZoeForTest,
} from './supports.js';

const asset = path => readFile(path, 'utf-8');

/** @type {import('ava').TestInterface<Awaited<ReturnType<makeTestContext>>>} */
// @ts-expect-error cast
const test = anyTest;

const vatRoots = {
  priceAuthority: priceAuthorityRoot,
};

const contractRoots = {
  liquidate: './src/vaultFactory/liquidateMinimum.js',
  VaultFactory: './src/vaultFactory/vaultFactory.js',
  amm: './src/vpool-xyk-amm/multipoolMarketMaker.js',
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
      case 'priceAuthority': {
        return vatRoots.priceAuthority();
      }
      default:
        throw Error(`not implemented ${name}`);
    }
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

    return Promise.all([
      // @ts-expect-error TODO: align types better
      makeClientManager(space),
      // @ts-expect-error TODO: align types better
      makeAddressNameHubs(space),
      // @ts-expect-error TODO: align types better
      bridgeCoreEval(space),
      startPriceAuthority({
        ...space,
        // @ts-expect-error TODO: align types better
        consume: { ...space.consume, loadVat },
      }),
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

    await Promise.all([
      installGovernance(space.consume.zoe, space.installation.produce),
      startEconomicCommittee(space),
      setupAmm(space),
      startVaultFactory(space),
    ]);
  };

  const enactProposal = async () => {
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
  };

  return { startDevNet, provisionMembers, startRunPreview, enactProposal };
};

test('voters get invitations', async t => {
  const s = await makeScenario();
  await s.startDevNet();
  const purses = await s.provisionMembers();
  await s.startRunPreview();

  await s.enactProposal();

  t.is(purses.size, 3);
  await Promise.all(
    [...purses].map(async ([_addr, purse]) => {
      const amt = await E(purse).getCurrentAmount();
      t.deepEqual(amt.value[0].description, 'questionPoser');
      t.true(amt.value[1].description.startsWith('Voter'));
    }),
  );
});

test.todo('users can open vaults');
