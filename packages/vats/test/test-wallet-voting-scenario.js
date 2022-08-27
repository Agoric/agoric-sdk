// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { start as committeeStart } from '@agoric/governance/src/committee.js';
import { makeFakeMarshaller } from '@agoric/notifier/tools/testSupports.js';
import { start as factoryStart } from '@agoric/smart-wallet/src/walletFactory.js';
import { makeFakeWalletBridgeManager } from '@agoric/smart-wallet/test/supports.js';
import { setupZCFTest } from '@agoric/zoe/test/unitTests/zcf/setupZcfTest.js';
import { Far } from '@endo/marshal';
import { E } from '@endo/far';
import { makeImportContext } from '@agoric/wallet-backend/src/marshal-contexts.js';
import { makeAgoricNamesAccess } from '../src/core/utils.js';
import { makeBoard } from '../src/lib-board.js';
import { makeNameHubKit } from '../src/nameHub.js';
import { makeMockChainStorageRoot } from '../tools/storage-test-utils.js';

/** @file integration test of a smart wallet holding an invitation to vote on a committee and voting with it */

test('voting by wallet scenario', async t => {
  const storageNode = makeMockChainStorageRoot();
  const marshaller = makeFakeMarshaller();

  const board = makeBoard();
  const { nameHub: namesByAddress, nameAdmin: namesByAddressAdmin } =
    makeNameHubKit();
  const {
    agoricNames,
    agoricNamesAdmin: _agoricNamesAdmin,
    spaces: _spaces,
  } = makeAgoricNamesAccess();
  const bridgeManager = makeFakeWalletBridgeManager(t);

  // set up a committee to flip a switch
  const {
    zoe,
    zcf: committeeZcf,
    zcf2: factoryZcf,
  } = await setupZCFTest(
    undefined,
    {
      committeeName: 'sayHi',
      committeeSize: 1,
    },
    {
      agoricNames,
      board,
      namesByAddress,
    },
  );
  const committeeFacets = committeeStart(committeeZcf, {
    storageNode,
    marshaller,
  });
  t.deepEqual(Object.keys(committeeFacets), ['publicFacet', 'creatorFacet']);
  const [voterInvitationP] = committeeFacets.creatorFacet.getVoterInvitations();
  const voterInvitation = await voterInvitationP;
  t.truthy(voterInvitation);

  // set up a wallet from the factory
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
  const smartWallet = await E(factoryFacets.creatorFacet).provideSmartWallet(
    'agoric1foo',
    emptyBank,
    myAddressNameAdmin,
  );
  t.truthy(smartWallet.performAction);

  // offer to the wallet a voting seat

  const [[petname]] = await smartWallet.getAdminFacet().getPurses();
  t.is(petname, 'Default Zoe invite purse');

  //   get the instance before using up the payment
  const invitationIssuer = await zoe.getInvitationIssuer();
  const voterInvitationAmount = await E(invitationIssuer).getAmountOf(
    voterInvitation,
  );
  // put it into the wallet's purse for invitations
  await smartWallet.getAdminFacet().deposit(petname, voterInvitation);
  //   await smartWallet.addPayment(voterInvitation);

  const { description, handle, instance } = voterInvitationAmount.value[0];
  console.log('DEBUG', { instance });
  t.is(description, 'Voter0');
  const clientContext = makeImportContext();
  clientContext.initBoardId(board.getId(instance), instance);
  const offer = {
    // id: rawId,
    invitationQuery: {
      // in practice, you'll only know the instance (which is public) and not which voter you are
      instance,
    },
    proposalTemplate: { want: {}, give: {} },
  };
  /** @type {import('@agoric/wallet-backend/src/lib-wallet.js').WalletBridgeAction} */
  const action = {
    type: 'WALLET_ACTION',
    action: JSON.stringify({
      type: 'acceptOffer',
      data: clientContext.fromBoard.serialize(harden(offer)),
    }),
    owner: 'yay',
    blockHeight: 123,
    blockTime: 0,
  };
  await smartWallet.performAction(action);

  // use wallet to vote

  // verify the vote went through
});
