import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeFakeStorageKit } from '@agoric/internal/src/storage-test-utils.js';
import { prepareLocalChainTools } from '@agoric/vats/src/localchain.js';
import { makeFakeBoard } from '@agoric/vats/tools/board-utils.js';
import { buildRootObject as buildBankVatRoot } from '@agoric/vats/src/vat-bank.js';
import { setUpZoeForTest } from '@agoric/zoe/tools/setup-zoe.js';
import { withAmountUtils } from '@agoric/zoe/tools/test-utils.js';
import buildManualTimer from '@agoric/zoe/tools/manualTimer.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import path from 'path';
import { makeFakeLocalchainBridge } from '../supports.js';

const { keys } = Object;
const dirname = path.dirname(new URL(import.meta.url).pathname);

const contractFile = `${dirname}/../../src/examples/stakeBld.contract.js`;
type StartFn =
  typeof import('@agoric/orchestration/src/examples/stakeBld.contract.js').start;

const bootstrap = async (t, { issuerKit }) => {
  t.log('bootstrap vat dependencies');
  const zone = makeHeapZone();
  const bankManager = await buildBankVatRoot(
    undefined,
    undefined,
    zone.mapStore('bankManager'),
  ).makeBankManager();
  await E(bankManager).addAsset('ubld', 'BLD', 'Staking Token', issuerKit);

  const localchainBridge = makeFakeLocalchainBridge(zone);
  const localchain = prepareLocalChainTools(
    zone.subZone('localchain'),
  ).makeLocalChain({
    bankManager,
    system: localchainBridge,
  });
  const timer = buildManualTimer(t.log);
  const marshaller = makeFakeBoard().getReadonlyMarshaller();
  const storage = makeFakeStorageKit('mockChainStorageRoot', {
    sequence: false,
  });
  return {
    timer,
    localchain,
    marshaller,
    storage,
  };
};

const coreEval = async (
  t,
  { timer, localchain, marshaller, storage, stake },
) => {
  t.log('install stakeBld contract');
  const { zoe, bundleAndInstall } = await setUpZoeForTest();
  const installation: Installation<StartFn> =
    await bundleAndInstall(contractFile);

  const { publicFacet } = await E(zoe).startInstance(
    installation,
    { In: stake.issuer },
    {},
    {
      localchain,
      marshaller,
      storageNode: storage.rootNode,
      timerService: timer,
      timerBrand: timer.getTimerBrand(),
    },
  );
  return { publicFacet, zoe };
};

test('stakeBld contract - makeAccount, deposit, withdraw', async t => {
  const issuerKit = makeIssuerKit('BLD');
  const stake = withAmountUtils(issuerKit);

  const bootstrapSpace = await bootstrap(t, { issuerKit });
  const { publicFacet } = await coreEval(t, { ...bootstrapSpace, stake });

  t.log('make a LocalChainAccount');
  const account = await E(publicFacet).makeAccount();
  t.truthy(account, 'account is returned');
  t.regex(await E(account).getAddress(), /agoric1/);

  const oneHundredStakeAmt = stake.make(1_000_000_000n);
  const oneHundredStakePmt = issuerKit.mint.mintPayment(oneHundredStakeAmt);

  t.log('deposit 100 bld to account');
  const depositResp = await E(account).deposit(oneHundredStakePmt);
  t.true(AmountMath.isEqual(depositResp, oneHundredStakeAmt), 'deposit');

  // TODO validate balance, .getBalance()

  t.log('withdraw 1 bld from account');
  const withdrawResp = await E(account).withdraw(oneHundredStakeAmt);
  const withdrawAmt = await stake.issuer.getAmountOf(withdrawResp);
  t.true(AmountMath.isEqual(withdrawAmt, oneHundredStakeAmt), 'withdraw');

  t.log('cannot withdraw more than balance');
  await t.throwsAsync(
    () => E(account).withdraw(oneHundredStakeAmt),
    {
      message: /Withdrawal of {.*} failed/,
    },
    'cannot withdraw more than balance',
  );
});

test('stakeBld contract - makeStakeBldInvitation', async t => {
  const issuerKit = makeIssuerKit('BLD');
  const stake = withAmountUtils(issuerKit);

  const bootstrapSpace = await bootstrap(t, { issuerKit });
  const { publicFacet, zoe } = await coreEval(t, { ...bootstrapSpace, stake });

  t.log('call makeStakeBldInvitation');
  const inv = await E(publicFacet).makeStakeBldInvitation();

  const hundred = stake.make(1_000_000_000n);

  t.log('make an offer for an account');
  // Want empty until (at least) #9087
  const userSeat = await E(zoe).offer(
    inv,
    { give: { In: hundred } },
    { In: stake.mint.mintPayment(hundred) },
  );
  const { invitationMakers } = await E(userSeat).getOfferResult();
  t.truthy(invitationMakers, 'received continuing invitation');

  t.log('make Delegate offer using invitationMakers');
  const delegateInv = await E(invitationMakers).Delegate('agoric1validator1', {
    brand: stake.brand,
    value: 1_000_000_000n,
  });
  const delegateOffer = await E(zoe).offer(
    delegateInv,
    { give: { In: hundred } },
    { In: stake.mint.mintPayment(hundred) },
  );
  const res = await E(delegateOffer).getOfferResult();
  t.deepEqual(res, {});
  t.log('Successfully delegated');

  await t.throwsAsync(() => E(invitationMakers).TransferAccount(), {
    message: 'not yet implemented',
  });
  await t.throwsAsync(() => E(invitationMakers).CloseAccount(), {
    message: 'not yet implemented',
  });
});

test('stakeBld contract - makeAccountInvitationMaker', async t => {
  const issuerKit = makeIssuerKit('BLD');
  const stake = withAmountUtils(issuerKit);

  const bootstrapSpace = await bootstrap(t, { issuerKit });
  const { publicFacet, zoe } = await coreEval(t, { ...bootstrapSpace, stake });

  t.log('call makeAcountInvitationMaker');
  const inv = await E(publicFacet).makeAcountInvitationMaker();

  const userSeat = await E(zoe).offer(inv);
  const offerResult = await E(userSeat).getOfferResult();
  t.true('account' in offerResult, 'received account');
  t.truthy('invitationMakers' in offerResult, 'received continuing invitation');
});
