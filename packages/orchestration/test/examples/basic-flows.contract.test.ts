import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import type { Instance } from '@agoric/zoe/src/zoeService/utils.js';
import { E, getInterfaceOf } from '@endo/far';
import path from 'path';
import { makeIssuerKit } from '@agoric/ertp';
import {
  type AmountUtils,
  withAmountUtils,
} from '@agoric/zoe/tools/test-utils.js';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractName = 'basic-flows';
const contractFile = `${dirname}/../../src/examples/${contractName}.contract.js`;
type StartFn =
  typeof import('../../src/examples/basic-flows.contract.js').start;

type TestContext = Awaited<ReturnType<typeof commonSetup>> & {
  zoe: ZoeService;
  instance: Instance<StartFn>;
  brands: Awaited<ReturnType<typeof commonSetup>>['brands'] & {
    moolah: AmountUtils;
  };
};

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  const setupContext = await commonSetup(t);
  const {
    brands: { bld, ist },
    bootstrap: { storage },
    commonPrivateArgs,
  } = setupContext;

  const moolah = withAmountUtils(makeIssuerKit('MOO'));

  const { zoe, bundleAndInstall } = await setUpZoeForTest();

  t.log('contract coreEval', contractName);
  const installation = await bundleAndInstall(contractFile);

  const storageNode = await E(storage.rootNode).makeChildNode(contractName);
  const { instance } = await E(zoe).startInstance(
    installation,
    { Stable: ist.issuer, Stake: bld.issuer, Moo: moolah.issuer },
    {},
    { ...commonPrivateArgs, storageNode },
  );

  t.context = {
    ...setupContext,
    zoe,
    instance,
    brands: { ...setupContext.brands, moolah },
  };
});

const chainConfigs = {
  agoric: { expectedAddress: 'agoric1fakeLCAAddress' },
  cosmoshub: { expectedAddress: 'cosmos1test' },
  osmosis: { expectedAddress: 'osmo1test' },
};

const orchestrationAccountScenario = test.macro({
  title: (_, chainName: string) =>
    `orchestrate - ${chainName} makeOrchAccount returns a ContinuingOfferResult`,
  exec: async (t, chainName: string) => {
    const config = chainConfigs[chainName as keyof typeof chainConfigs];
    if (!config) {
      return t.fail(`Unknown chain: ${chainName}`);
    }

    const {
      bootstrap: { vowTools: vt },
      zoe,
      instance,
    } = t.context;
    const publicFacet = await E(zoe).getPublicFacet(instance);
    const inv = E(publicFacet).makeOrchAccountInvitation();
    const userSeat = E(zoe).offer(inv, {}, undefined, { chainName });
    const { invitationMakers, publicSubscribers } = await vt.when(
      E(userSeat).getOfferResult(),
    );

    t.regex(getInterfaceOf(invitationMakers)!, /invitationMakers/);

    const { description, storagePath, subscriber } = publicSubscribers.account;
    t.regex(description!, /Account holder/);

    const expectedStoragePath = `mockChainStorageRoot.basic-flows.${config.expectedAddress}`;
    t.is(storagePath, expectedStoragePath);

    t.regex(getInterfaceOf(subscriber)!, /Durable Publish Kit subscriber/);
  },
});

test(orchestrationAccountScenario, 'agoric');
test(orchestrationAccountScenario, 'cosmoshub');

test('Deposit, Withdraw - LocalOrchAccount', async t => {
  const {
    brands: { bld, ist },
    bootstrap: { vowTools: vt },
    zoe,
    instance,
    utils: { inspectBankBridge, pourPayment },
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const inv = E(publicFacet).makeOrchAccountInvitation();
  const userSeat = E(zoe).offer(inv, {}, undefined, { chainName: 'agoric' });
  const { invitationMakers } = await vt.when(E(userSeat).getOfferResult());

  const twentyIST = ist.make(20n);
  const tenBLD = bld.make(10n);
  const Stable = await pourPayment(twentyIST);
  const Stake = await pourPayment(tenBLD);

  const depositInv = await E(invitationMakers).Deposit();

  const depositSeat = E(zoe).offer(
    depositInv,
    {
      give: { Stable: twentyIST, Stake: tenBLD },
      want: {},
    },
    { Stable, Stake },
  );
  const depositRes = await vt.when(E(depositSeat).getOfferResult());
  t.is(depositRes, undefined, 'undefined on success');

  t.deepEqual(
    inspectBankBridge().slice(-2),
    [
      {
        type: 'VBANK_GIVE',
        recipient: 'agoric1fakeLCAAddress',
        denom: 'uist',
        amount: '20',
      },
      {
        type: 'VBANK_GIVE',
        recipient: 'agoric1fakeLCAAddress',
        denom: 'ubld',
        amount: '10',
      },
    ],
    'funds deposited to LCA',
  );

  const depositPayouts = await E(depositSeat).getPayouts();
  t.is((await ist.issuer.getAmountOf(depositPayouts.Stable)).value, 0n);
  t.is((await bld.issuer.getAmountOf(depositPayouts.Stake)).value, 0n);

  // withdraw the payments we just deposited
  const withdrawInv = await E(invitationMakers).Withdraw();
  const withdrawSeat = E(zoe).offer(withdrawInv, {
    give: {},
    want: { Stable: twentyIST, Stake: tenBLD },
  });
  const withdrawRes = await vt.when(E(withdrawSeat).getOfferResult());
  t.is(withdrawRes, undefined, 'undefined on success');

  const withdrawPayouts = await E(withdrawSeat).getPayouts();
  t.deepEqual(await ist.issuer.getAmountOf(withdrawPayouts.Stable), twentyIST);
  t.deepEqual(await bld.issuer.getAmountOf(withdrawPayouts.Stake), tenBLD);
});

test('Deposit, Withdraw errors - LocalOrchAccount', async t => {
  const {
    brands: { ist, moolah },
    bootstrap: { vowTools: vt },
    zoe,
    instance,
  } = t.context;
  const publicFacet = await E(zoe).getPublicFacet(instance);
  const inv = E(publicFacet).makeOrchAccountInvitation();
  const userSeat = E(zoe).offer(inv, {}, undefined, { chainName: 'agoric' });
  const { invitationMakers } = await vt.when(E(userSeat).getOfferResult());

  // deposit non-vbank asset (not supported)
  const tenMoolah = moolah.make(10n);
  const Moo = await E(moolah.mint).mintPayment(tenMoolah);
  const depositInv = await E(invitationMakers).Deposit();
  const depositSeat = E(zoe).offer(
    depositInv,
    {
      give: { Moo: tenMoolah },
      want: {},
    },
    { Moo },
  );
  await t.throwsAsync(vt.when(E(depositSeat).getOfferResult()), {
    message:
      'One or more deposits failed ["[Error: key \\"[Alleged: MOO brand]\\" not found in collection \\"brandToAssetRecord\\"]"]',
  });
  const depositPayouts = await E(depositSeat).getPayouts();
  t.deepEqual(
    await moolah.issuer.getAmountOf(depositPayouts.Moo),
    tenMoolah,
    'deposit returned on failure',
  );

  {
    // withdraw more than balance (insufficient funds)
    const tenIST = ist.make(10n);
    const withdrawInv = await E(invitationMakers).Withdraw();
    const withdrawSeat = E(zoe).offer(withdrawInv, {
      give: {},
      want: { Stable: tenIST },
    });
    await t.throwsAsync(vt.when(E(withdrawSeat).getOfferResult()), {
      message:
        'One or more withdrawals failed ["[RangeError: -10 is negative]"]',
    });
    const payouts = await E(withdrawSeat).getPayouts();
    t.deepEqual((await ist.issuer.getAmountOf(payouts.Stable)).value, 0n);
  }
  {
    // withdraw non-vbank asset
    const withdrawInv = await E(invitationMakers).Withdraw();
    const withdrawSeat = E(zoe).offer(withdrawInv, {
      give: {},
      want: { Moo: tenMoolah },
    });
    await t.throwsAsync(vt.when(E(withdrawSeat).getOfferResult()), {
      message:
        'One or more withdrawals failed ["[Error: key \\"[Alleged: MOO brand]\\" not found in collection \\"brandToAssetRecord\\"]"]',
    });
    const payouts = await E(withdrawSeat).getPayouts();
    t.deepEqual((await moolah.issuer.getAmountOf(payouts.Moo)).value, 0n);
  }
});
