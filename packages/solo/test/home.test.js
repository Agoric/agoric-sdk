/* eslint-env node */

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import bundleSourceAmbient from '@endo/bundle-source';
import { AmountMath } from '@agoric/ertp';
import { TimeMath } from '@agoric/time';
import { Far } from '@endo/marshal';
import { resolve as importMetaResolve } from 'import-meta-resolve';

import { makeFixture, E } from './captp-fixture.js';

const SOLO_PORT = 7999;

// XXX test depends on this exact value from the Inter Protocol economy,
// by way of agoric-cli (which this test covertly depends upon)
export const Stable = harden(
  /** @type {const } */ ({
    symbol: 'IST',
    denom: 'uist',
    proposedName: 'Agoric stable token',
    assetKind: 'nat',
    displayInfo: {
      decimalPlaces: 6,
      assetKind: 'nat',
    },
  }),
);

//#region setup (ambient authority is confined to this region)
test.before('setup', async t => {
  const loadBundle = async specifier => {
    const contractUrl = await importMetaResolve(specifier, import.meta.url);
    const contractRoot = new URL(contractUrl).pathname;
    t.log({ contractRoot });
    const bundle = await bundleSourceAmbient(contractRoot);
    return bundle;
  };
  const { homeP, kill } = await makeFixture(SOLO_PORT, process.env.NOISY);
  const home = await homeP;

  t.context = { home, teardown: kill, loadBundle };

  t.truthy('ready');
});
//#endregion

// Now come the tests that use `home`...
// =========================================

test.skip('home.board', async t => {
  const { home } = t.context;
  const { board } = E.get(home);
  await t.throwsAsync(
    () => E(board).getValue('board0120'),
    { message: /board does not have id/ },
    `getting a value for a fake id throws`,
  );
  await t.throwsAsync(
    () => E(board).getValue('board0000000000'),
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

test.skip('home.wallet - transfer funds to the feePurse', async t => {
  const { home } = t.context;
  const { wallet, faucet } = E.get(home);
  const feePurse = E(faucet).getFeePurse();
  const feeBrand = await E(feePurse).getAllegedBrand();
  const feeAmount = AmountMath.make(feeBrand, 10_000_000n);
  const feePayment = await E(E(wallet).getPurse(Stable.proposedName)).withdraw(
    feeAmount,
  );
  const deposited = await E(feePurse).deposit(feePayment);
  t.deepEqual(deposited, feeAmount, `all fees deposited to feePurse`);
});

test.skip('home.wallet - receive zoe invite', async t => {
  const { home, loadBundle } = t.context;
  const { wallet, zoe, board } = E.get(home);

  // Setup contract in order to get an invite to use in tests
  const bundle = await loadBundle(
    '@agoric/zoe/src/contracts/automaticRefund.js',
  );
  const installationHandle = await E(zoe).install(bundle);
  const { creatorInvitation: invite } =
    await E(zoe).startInstance(installationHandle);

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

test.skip('home.wallet - central issuer setup', async t => {
  const { home } = t.context;
  const { wallet } = E.get(home);

  // Check that the wallet knows about the central issuer.
  const issuers = await E(wallet).getIssuers();
  const issuersMap = new Map(issuers);
  const centralIssuer = issuersMap.get(Stable.symbol);

  const centralPurse = await E(wallet).getPurse(Stable.proposedName);
  const brandFromIssuer = await E(centralIssuer).getBrand();
  const brandFromPurse = await E(centralPurse).getAllegedBrand();
  t.is(brandFromPurse, brandFromIssuer);
});

test.serial('home.localTimerService makeNotifier', async t => {
  const { home } = t.context;
  const { localTimerService } = E.get(home);
  const notifier = E(localTimerService).makeNotifier(1n, 1n);
  const update1 = await E(notifier).getUpdateSince();
  const firstUpdate = update1.updateCount;
  t.true(firstUpdate > 0);
  const update2 = await E(notifier).getUpdateSince(update1.updateCount);
  t.truthy(BigInt(update2.updateCount) > BigInt(firstUpdate));

  // Tests gets an actual localTimerService, which returns actual times. We
  // can't verify the actual time, so we compare to make sure it's increasing.
  t.truthy(TimeMath.compareAbs(update2.value, update1.value) > 0);
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
  const { home } = t.context;
  const { localTimerService } = E.get(home);
  const timestamp = await E(localTimerService).getCurrentTimestamp();
  const repeater = E(localTimerService).makeRepeater(1n, 1n);
  const handler = makeHandler();
  await E(repeater).schedule(handler);
  const notifier = E(localTimerService).makeNotifier(1n, 1n);
  await E(notifier).getUpdateSince();

  t.truthy(handler.getCalls() >= 1);
  t.truthy(TimeMath.compareAbs(handler.getArgs()[0], timestamp) > 0);
});

// =========================================
// This runs after all the tests.
test.after.always('teardown', async t => {
  const { teardown } = t.context;
  await teardown();
  t.truthy('shutdown');
});
