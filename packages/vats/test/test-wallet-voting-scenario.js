// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { start as committeeStart } from '@agoric/governance/src/committee.js';
import { makeFakeMarshaller } from '@agoric/notifier/tools/testSupports.js';
import { start as factoryStart } from '@agoric/smart-wallet/src/walletFactory.js';
import { makeFakeWalletBridgeManager } from '@agoric/smart-wallet/test/supports.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { Far } from '@endo/marshal';
import { makeAgoricNamesAccess } from '../src/core/utils.js';
import { makeBoard } from '../src/lib-board.js';
import { makeNameHubKit } from '../src/nameHub.js';
import { makeMockChainStorageRoot } from '../tools/storage-test-utils.js';

/** @file integration test of a smart wallet holding an invitation to vote on a committee and voting with it */

test('voting by wallet scenario', async t => {
  const storageNode = makeMockChainStorageRoot();
  const marshaller = makeFakeMarshaller();

  // set up a committee to flip a switch
  const { zcf: committeeZcf } = await setupZCFTest(undefined, {
    committeeName: 'sayHi',
    committeeSize: 1,
  });
  const committeeFacets = committeeStart(committeeZcf, {
    storageNode,
    marshaller,
  });
  t.deepEqual(Object.keys(committeeFacets), ['publicFacet', 'creatorFacet']);
  const [voterInvitation] = committeeFacets.creatorFacet.getVoterInvitations();
  t.truthy(voterInvitation);

  // set up a wallet from the factory
  const board = makeBoard();
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  const {
    agoricNames,
    agoricNamesAdmin: _agoricNamesAdmin,
    spaces: _spaces,
  } = makeAgoricNamesAccess();
  const bridgeManager = makeFakeWalletBridgeManager(t);
  const { zcf: factoryZcf } = await setupZCFTest(undefined, {
    agoricNames,
    board,
    namesByAddress,
  });
  const factoryFacets = await factoryStart(factoryZcf, {
    bridgeManager,
    storageNode,
  });
  t.deepEqual(Object.keys(factoryFacets), ['creatorFacet']);
  /** @type {import('../src/vat-bank.js').Bank} */
  // @ts-expect-error cast
  const emptyBank = Far('bank', { getAssetSubscription: () => null });
  /** @type {MyAddressNameAdmin} */
  const myAddressNameAdmin = Far('myAddressNameAdmin', {
    ...namesByAddressAdmin,
    getMyAddress: () => 'agoric1foo',
  });
  const smartWallet = await factoryFacets.creatorFacet.provideSmartWallet(
    'agoric1foo',
    emptyBank,
    myAddressNameAdmin,
  );
  t.truthy(smartWallet.performAction);

  // offer to the wallet a voting seat

  // use wallet to vote

  // verify the vote went through
  t.pass();
});
