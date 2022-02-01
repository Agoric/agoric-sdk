/* global process */

import '@endo/init/pre-bundle-source.js';

// `test.after.always` does not yet seem compatible with ses-ava
// See https://github.com/endojs/endo/issues/647
// TODO restore
// import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';
import '@agoric/swingset-vat/tools/prepare-test-env.js';
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import bundleSource from '@endo/bundle-source';
import { AmountMath } from '@agoric/ertp';
import { Far } from '@endo/marshal';
import { resolve as importMetaResolve } from 'import-meta-resolve';
import { CENTRAL_ISSUER_NAME } from '@agoric/vats/src/issuers.js';

import { makeFixture, E } from './captp-fixture.js';

const SOLO_PORT = 7999;

// This runs before all the tests.
let home;
let teardown;
test.before('setup', async t => {
  const { homeP, kill } = await makeFixture(SOLO_PORT, process.env.NOISY);
  teardown = kill;
  home = await homeP;
  t.truthy('ready');
});

// Now come the tests that use `home`...
// =========================================

test.serial('home.board', async t => {
  const { board } = E.get(home);
  await t.throwsAsync(
    () => E(board).getValue('148'),
    { message: /board does not have id/ },
    `getting a value for a fake id throws`,
  );
  await t.throwsAsync(
    () => E(board).getValue('0000000000'),
    { message: /id is probably a typo/ },
    `using a non-verified id throws`,
  );

  const myValue = Far('myValue', {});
  const myId = await E(board).getId(myValue);
  t.is(typeof myId, 'string', `board key is string`);

  const valueInBoard = await E(board).getValue(myId);
  t.deepEqual(valueInBoard, myValue, `board contains myValue`);

  const myId2 = await E(board).getId(myValue);
  t.is(myId2, myId, `board gives the same id for the same value`);
});

test.serial('home.wallet - transfer funds to the feePurse', async t => {
  const { wallet, faucet } = E.get(home);
  const feePurse = E(faucet).getFeePurse();
  const feeBrand = await E(feePurse).getAllegedBrand();
  const feeAmount = AmountMath.make(feeBrand, 10_000_000n);
  const feePayment = await E(
    E(wallet).getPurse('Agoric RUN currency'),
  ).withdraw(feeAmount);
  const deposited = await E(feePurse).deposit(feePayment);
  t.deepEqual(deposited, feeAmount, `all fees deposited to feePurse`);
});

test.serial('home.wallet - receive zoe invite', async t => {
  const { wallet, zoe, board } = E.get(home);

  // Setup contract in order to get an invite to use in tests
  const contractUrl = await importMetaResolve(
    '@agoric/zoe/src/contracts/automaticRefund.js',
    import.meta.url,
  );
  const contractRoot = new URL(contractUrl).pathname;
  t.log({ contractRoot });
  const bundle = await bundleSource(contractRoot);
  const installationHandle = await E(zoe).install(bundle);
  const { creatorInvitation: invite } = await E(zoe).startInstance(
    installationHandle,
  );

  // Check that the wallet knows about the Zoe invite issuer and starts out
  // with a default Zoe invite issuer purse.
  const zoeInviteIssuer = await E(zoe).getInvitationIssuer();
  const issuers = await E(wallet).getIssuers();
  const issuersMap = new Map(issuers);
  t.deepEqual(
    issuersMap.get('zoe invite'),
    zoeInviteIssuer,
    `wallet knows about the Zoe invite issuer`,
  );
  const invitePurse = await E(wallet).getPurse('Default Zoe invite purse');
  const zoeInviteBrand = await E(invitePurse).getAllegedBrand();
  t.is(
    zoeInviteBrand,
    await E(zoeInviteIssuer).getBrand(),
    `invite purse is actually a zoe invite purse`,
  );

  // The code below is meant to be carried out in a Dapp backend.
  // The dapp gets the depositBoardId for the default Zoe invite purse
  // and sends the invite.
  const inviteBrandBoardId = await E(board).getId(zoeInviteBrand);
  const depositBoardId = await E(wallet).getDepositFacetId(inviteBrandBoardId);
  const depositFacet = await E(board).getValue(depositBoardId);
  await E(depositFacet).receive(invite);

  // The invite was successfully received in the user's wallet.
  const invitePurseBalance = await E(invitePurse).getCurrentAmount();
  t.is(
    invitePurseBalance.value[0].description,
    'getRefund',
    `invite successfully deposited`,
  );
});

test.serial('home.wallet - central issuer setup', async t => {
  const { wallet } = E.get(home);

  // Check that the wallet knows about the central issuer.
  const issuers = await E(wallet).getIssuers();
  const issuersMap = new Map(issuers);
  const centralIssuer = issuersMap.get(CENTRAL_ISSUER_NAME);

  const centralPurse = await E(wallet).getPurse('Agoric RUN currency');
  const brandFromIssuer = await E(centralIssuer).getBrand();
  const brandFromPurse = await E(centralPurse).getAllegedBrand();
  t.is(brandFromPurse, brandFromIssuer);
});

test.serial('home.localTimerService makeNotifier', async t => {
  const { localTimerService } = E.get(home);
  const notifier = E(localTimerService).makeNotifier(1, 1);
  const update1 = await E(notifier).getUpdateSince();
  const firstUpdate = update1.updateCount;
  t.truthy(firstUpdate > 0);
  const update2 = await E(notifier).getUpdateSince(update1.updateCount);
  t.is(update2.updateCount, firstUpdate + 1);

  // Tests gets an actual localTimerService, which returns actual times. We
  // can't verify the actual time, so we compare to make sure it's increasing.
  t.truthy(update2.value > update1.value);
});

function makeHandler() {
  let calls = 0;
  const args = [];
  return Far('wake handler', {
    getCalls() {
      return calls;
    },
    getArgs() {
      return args;
    },
    wake(arg) {
      args.push(arg);
      calls += 1;
    },
  });
}

test.serial('home.localTimerService makeRepeater', async t => {
  const { localTimerService } = E.get(home);
  const timestamp = await E(localTimerService).getCurrentTimestamp();
  const repeater = E(localTimerService).makeRepeater(1, 1);
  const handler = makeHandler();
  await E(repeater).schedule(handler);
  const notifier = E(localTimerService).makeNotifier(1, 1);
  await E(notifier).getUpdateSince();

  t.truthy(handler.getCalls() >= 1);
  t.truthy(handler.getArgs()[0] > timestamp);
});

// =========================================
// This runs after all the tests.
test.after.always('teardown', async t => {
  await teardown();
  t.truthy('shutdown');
});
