import '@agoric/install-ses';
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';

import { makeFixture, E } from './captp-fixture';

// This runs before all the tests.
let home;
let teardown;
test('setup', async t => {
  try {
    const { homeP, kill } = makeFixture();
    teardown = kill;
    home = await homeP;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

// Now come the tests that use `home`...
// =========================================

test('home.registry', async t => {
  try {
    const { registry } = E.G(home);
    const regVal = await E(registry).get('foolobr_19191');
    t.equals(regVal, undefined, 'random registry name is undefined');

    const target = 'something';
    const myRegKey = await E(registry).register('myname', target);
    t.equals(typeof myRegKey, 'string', 'registry key is string');

    const registered = await E(registry).get(myRegKey);
    t.equals(registered, target, 'registry registers target');
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('home.board', async t => {
  try {
    const { board } = E.G(home);
    t.rejects(
      () => E(board).getValue('0000000000'),
      `getting a value for a fake id throws`,
    );

    const myValue = {};
    const myId = await E(board).getId(myValue);
    t.equals(typeof myId, 'string', `board key is string`);

    const valueInBoard = await E(board).getValue(myId);
    t.deepEquals(valueInBoard, myValue, `board contains myValue`);

    const myId2 = await E(board).getId(myValue);
    t.equals(myId2, myId, `board gives the same id for the same value`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('home.wallet - receive zoe invite', async t => {
  try {
    const { wallet, zoe, board } = E.G(home);

    // Setup contract in order to get an invite to use in tests
    const contractRoot = require.resolve(
      '@agoric/zoe/src/contracts/automaticRefund',
    );
    const bundle = await bundleSource(contractRoot);
    const installationHandle = await E(zoe).install(bundle);
    const { invite } = await E(zoe).makeInstance(installationHandle);

    // Check that the wallet knows about the Zoe invite issuer and starts out
    // with a default Zoe invite issuer purse.
    const zoeInviteIssuer = await E(zoe).getInviteIssuer();
    const issuers = await E(wallet).getIssuers();
    const issuersMap = new Map(issuers);
    t.deepEquals(
      issuersMap.get('zoe invite'),
      zoeInviteIssuer,
      `wallet knows about the Zoe invite issuer`,
    );
    const invitePurse = await E(wallet).getPurse('Default Zoe invite purse');
    const zoeInviteBrand = await E(invitePurse).getAllegedBrand();
    t.equals(
      zoeInviteBrand,
      await E(zoeInviteIssuer).getBrand(),
      `invite purse is actually a zoe invite purse`,
    );

    // The code below is meant to be carried out in a Dapp backend.
    // The dapp gets the depositBoardId for the default Zoe invite purse
    // and sends the invite.
    const inviteBrandBoardId = await E(board).getId(zoeInviteBrand);
    const depositBoardId = await E(wallet).getDepositFacetId(
      inviteBrandBoardId,
    );
    const depositFacet = await E(board).getValue(depositBoardId);
    await E(depositFacet).receive(invite);

    // The invite was successfully received in the user's wallet.
    const invitePurseBalance = await E(invitePurse).getCurrentAmount();
    t.equals(
      invitePurseBalance.extent[0].inviteDesc,
      'getRefund',
      `invite successfully deposited`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

// =========================================
// This runs after all the tests.
test('teardown', async t => {
  try {
    await teardown();
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
