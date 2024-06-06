import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { AmountMath } from '@agoric/ertp';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { E } from '@endo/far';
import path from 'path';
import { commonSetup } from '../supports.js';

const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/stakeBld.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/stakeBld.contract.js').start;

const startContract = async ({
  agoricNames,
  timer,
  localchain,
  marshaller,
  storage,
  bld,
}) => {
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { In: bld.issuer },
    {},
    {
      agoricNames,
      localchain,
      marshaller,
      storageNode: storage.rootNode,
      timerService: timer,
      timerBrand: timer.getTimerBrand(),
    },
  );
  return { publicFacet, zoe };
};

test('makeAccount, deposit, withdraw', async t => {
  const {
    bootstrap,
    brands: { bld },
    utils,
  } = await commonSetup(t);
  const { publicFacet } = await startContract({ ...bootstrap, bld });

  t.log('make a LocalChainAccount');
  const account = await E(publicFacet).makeAccount();
  t.truthy(account, 'account is returned');
  t.regex(await E(account).getAddress(), /agoric1/);

  t.log('deposit 100 bld to account');
  const depositResp = await E(account).deposit(
    await utils.pourPayment(bld.units(100)),
  );
  t.true(AmountMath.isEqual(depositResp, bld.units(100)), 'deposit');

  // TODO validate balance, .getBalance()

  t.log('withdraw bld from account');
  const withdrawResp = await E(account).withdraw(bld.units(100));
  const withdrawAmt = await bld.issuer.getAmountOf(withdrawResp);
  t.true(AmountMath.isEqual(withdrawAmt, bld.units(100)), 'withdraw');

  await t.throwsAsync(
    () => E(account).withdraw(bld.units(100)),
    undefined, // fake bank error messages don't match production
    'cannot withdraw more than balance',
  );
});

test('makeStakeBldInvitation', async t => {
  const {
    bootstrap,
    brands: { bld },
    utils,
  } = await commonSetup(t);
  const { publicFacet, zoe } = await startContract({ ...bootstrap, bld });

  t.log('call makeStakeBldInvitation');
  const inv = await E(publicFacet).makeStakeBldInvitation();

  const hundred = bld.make(1_000_000_000n);

  t.log('make an offer for an account');
  // Want empty until (at least) #9087
  const userSeat = await E(zoe).offer(
    inv,
    { give: { In: hundred } },
    { In: utils.pourPayment(hundred) },
  );
  const { invitationMakers } = await E(userSeat).getOfferResult();
  t.truthy(invitationMakers, 'received continuing invitation');

  t.log('make Delegate offer using invitationMakers');
  const delegateInv = await E(invitationMakers).Delegate('agoric1validator1', {
    brand: bld.brand,
    value: 1_000_000_000n,
  });
  const delegateOffer = await E(zoe).offer(
    delegateInv,
    { give: { In: hundred } },
    { In: utils.pourPayment(hundred) },
  );
  const res = await E(delegateOffer).getOfferResult();
  t.deepEqual(res, {});
  t.log('Successfully delegated');

  await t.throwsAsync(() => E(invitationMakers).CloseAccount(), {
    message: 'not yet implemented',
  });
});

test('makeAccountInvitationMaker', async t => {
  const {
    bootstrap,
    brands: { bld },
  } = await commonSetup(t);
  const { publicFacet, zoe } = await startContract({ ...bootstrap, bld });

  const inv = await E(publicFacet).makeAccountInvitationMaker();

  const userSeat = await E(zoe).offer(inv);
  const offerResult = await E(userSeat).getOfferResult();
  t.true('account' in offerResult, 'received account');
  t.truthy('invitationMakers' in offerResult, 'received continuing invitation');
});
