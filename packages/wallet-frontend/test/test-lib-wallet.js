/* global harden */

import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import makeIssuerKit from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/test/unitTests/contracts/fakeVatAdmin';
import { makeRegistrar } from '@agoric/registrar';

import { E } from '@agoric/eventual-send';
import { makeWallet } from '../lib/lib-wallet';
import { makeBoard } from '@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board';

const setupTest = async () => {
  const pursesStateChangeLog = [];
  const inboxStateChangeLog = [];
  const pursesStateChangeHandler = data => {
    pursesStateChangeLog.push(data);
  };
  const inboxStateChangeHandler = data => {
    inboxStateChangeLog.push(data);
  };

  const moolaBundle = makeIssuerKit('moola');
  const simoleanBundle = makeIssuerKit('simolean');
  const rpgBundle = makeIssuerKit('rpg', 'strSet');
  const zoe = makeZoe(fakeVatAdmin);
  const registry = makeRegistrar();
  const board = makeBoard();

  // Create AutomaticRefund instance
  const automaticRefundContractRoot = require.resolve(
    '@agoric/zoe/src/contracts/automaticRefund',
  );
  const automaticRefundBundle = await bundleSource(automaticRefundContractRoot);
  const installationHandle = await zoe.install(automaticRefundBundle);
  const issuerKeywordRecord = harden({ Contribution: moolaBundle.issuer });
  const {
    invite,
    instanceRecord: { handle: instanceHandle },
  } = await zoe.makeInstance(installationHandle, issuerKeywordRecord);

  // Create Autoswap instance
  const autoswapContractRoot = require.resolve(
    '@agoric/zoe/src/contracts/autoswap',
  );
  const autoswapBundle = await bundleSource(autoswapContractRoot);
  const autoswapInstallationHandle = await zoe.install(autoswapBundle);
  const autoswapIssuerKeywordRecord = harden({
    TokenA: moolaBundle.issuer,
    TokenB: simoleanBundle.issuer,
  });
  const {
    invite: addLiquidityInvite,
    instanceRecord: { handle: autoswapInstanceHandle },
  } = await zoe.makeInstance(
    autoswapInstallationHandle,
    autoswapIssuerKeywordRecord,
  );

  const wallet = await makeWallet({
    zoe,
    board,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  });
  return {
    moolaBundle,
    simoleanBundle,
    rpgBundle,
    zoe,
    registry,
    board,
    wallet,
    invite,
    addLiquidityInvite,
    installationHandle,
    instanceHandle,
    autoswapInstanceHandle,
    autoswapInstallationHandle,
    pursesStateChangeLog,
    inboxStateChangeLog,
  };
};

test('lib-wallet issuer and purse methods', async t => {
  t.plan(10);
  try {
    const {
      zoe,
      moolaBundle,
      rpgBundle,
      wallet,
      inboxStateChangeLog,
      pursesStateChangeLog,
    } = await setupTest();
    const inviteIssuer = await E(zoe).getInviteIssuer();
    t.deepEquals(
      wallet.getIssuers(),
      [['zoe invite', inviteIssuer]],
      `wallet starts off with only the zoe invite issuer`,
    );
    await wallet.addIssuer('moola', moolaBundle.issuer);
    await wallet.addIssuer('rpg', rpgBundle.issuer);
    t.deepEquals(
      wallet.getIssuers(),
      [
        ['zoe invite', inviteIssuer],
        ['moola', moolaBundle.issuer],
        ['rpg', rpgBundle.issuer],
      ],
      `two issuers added`,
    );
    const issuersMap = new Map(wallet.getIssuers());
    t.equals(
      issuersMap.get('moola'),
      moolaBundle.issuer,
      `can get issuer by issuer petname`,
    );

    const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

    const invitePurse = wallet.getPurse(ZOE_INVITE_PURSE_PETNAME);
    t.deepEquals(
      wallet.getPurses(),
      [['Default Zoe invite purse', invitePurse]],
      `starts off with only the invite purse`,
    );
    await wallet.makeEmptyPurse('moola', 'fun money');
    const moolaPurse = wallet.getPurse('fun money');
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.getEmpty(),
      `empty purse is empty`,
    );
    t.deepEquals(
      wallet.getPurses(),
      [
        ['Default Zoe invite purse', invitePurse],
        ['fun money', moolaPurse],
      ],
      `two purses currently`,
    );
    t.deepEquals(
      wallet.getPurseIssuer('fun money'),
      moolaBundle.issuer,
      `can get issuer from purse petname`,
    );
    const moolaPayment = moolaBundle.mint.mintPayment(
      moolaBundle.amountMath.make(100),
    );
    await wallet.deposit('fun money', moolaPayment);
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.make(100),
      `deposit successful`,
    );
    t.deepEquals(
      pursesStateChangeLog,
      [
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","value":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"value\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"value":[]}}]',
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","value":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"value\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"value":[]}}]',
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","value":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"value\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"value":[]}}]',
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","value":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"value\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"value":[]}},{"brandBoardId":"16679794","brandPetname":"moola","pursePetname":"fun money","value":0,"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"value\\":0}","slots":[{"kind":"brand","petname":"moola"}]},"currentAmount":{"brand":{"kind":"brand","petname":"moola"},"value":0}}]',
      ],
      `pursesStateChangeLog`,
    );
    t.deepEquals(inboxStateChangeLog, [], `inboxStateChangeLog`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

test('lib-wallet dapp suggests issuer, instance, installation petnames', async t => {
  t.plan(14);
  try {
    const {
      board,
      zoe,
      invite,
      autoswapInstallationHandle,
      instanceHandle,
      wallet,
      pursesStateChangeLog,
      inboxStateChangeLog,
    } = await setupTest();

    const { issuer: bucksIssuer } = makeIssuerKit('bucks');
    const bucksIssuerBoardId = await E(board).getId(bucksIssuer);
    await wallet.suggestIssuer('bucks', bucksIssuerBoardId);

    t.equals(
      wallet.getIssuer('bucks'),
      bucksIssuer,
      `bucksIssuer is stored in wallet`,
    );

    // We will deposit an invite and add an offer to the wallet to
    // look at how changes in petnames affect the inboxState changes.
    // Later we will deposit another invite (with no offer) to look at
    // how changes in petnames affect the purseState changes. Note
    // that we withdraw an invite for the offer during the
    // `addOffer` call, so any invites associated with an offer are no
    // longer in the purse.
    const inviteIssuer = await E(zoe).getInviteIssuer();
    const zoeInvitePurse = await E(wallet).getPurse('Default Zoe invite purse');
    const {
      value: [{ handle: inviteHandle, installationHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
    await wallet.deposit('Default Zoe invite purse', invite);

    const instanceHandleBoardId = await E(board).getId(instanceHandle);
    const installationHandleBoardId = await E(board).getId(installationHandle);

    const formulateBasicOffer = (id, inviteHandleBoardId) =>
      harden({
        // JSONable ID for this offer.  This is scoped to the origin.
        id,

        inviteHandleBoardId,
        instanceHandleBoardId,
        installationHandleBoardId,

        proposalTemplate: {},
      });

    const rawId = '1588645041696';
    const offer = formulateBasicOffer(rawId, inviteHandleBoardId1);

    await wallet.addOffer(offer);

    // Deposit a zoe invite in the wallet so that we can see how the
    // invite purse balance is rendered with petnames. We should see
    // unnamed first, then the petnames after those are suggested by
    // the dapp.
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);
    const invite2 = await E(publicAPI).makeInvite();
    const {
      value: [{ handle: inviteHandle2 }],
    } = await E(inviteIssuer).getAmountOf(invite2);
    await wallet.deposit('Default Zoe invite purse', invite2);

    const currentAmount = await E(zoeInvitePurse).getCurrentAmount();
    t.deepEquals(
      currentAmount.value,
      [
        {
          inviteDesc: 'getRefund',
          handle: inviteHandle2,
          instanceHandle,
          installationHandle,
        },
      ],
      `a single invite in zoe purse`,
    );

    const zoeInvitePurseState = JSON.parse(
      pursesStateChangeLog[pursesStateChangeLog.length - 1],
    )[0];
    t.deepEquals(
      zoeInvitePurseState,
      {
        brandBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            inviteDesc: 'getRefund',
            handle: {},
            instanceHandle: {},
            installationHandle: {},
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"inviteDesc":"getRefund","handle":{"@qclass":"slot","index":1},"instanceHandle":{"@qclass":"slot","index":2},"installationHandle":{"@qclass":"slot","index":3}}]}',
          slots: [
            { kind: 'brand', petname: 'zoe invite' },
            { kind: 'unnamed', petname: 'unnamed-4' },
            { kind: 'unnamed', petname: 'unnamed-2' },
            { kind: 'unnamed', petname: 'unnamed-3' },
          ],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'zoe invite' },
          value: [
            {
              inviteDesc: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instanceHandle: { kind: 'unnamed', petname: 'unnamed-2' },
              installationHandle: { kind: 'unnamed', petname: 'unnamed-3' },
            },
          ],
        },
      },
      `zoeInvitePurseState with no names and invite2`,
    );

    const automaticRefundInstanceBoardId = await E(board).getId(instanceHandle);
    await wallet.suggestInstance(
      'automaticRefund',
      automaticRefundInstanceBoardId,
    );

    t.equals(
      wallet.getInstance('automaticRefund'),
      instanceHandle,
      `automaticRefund instanceHandle stored in wallet`,
    );

    const automaticRefundInstallationBoardId = await E(board).getId(
      installationHandle,
    );
    await wallet.suggestInstallation(
      'automaticRefund',
      automaticRefundInstallationBoardId,
    );

    t.equals(
      wallet.getInstallation('automaticRefund'),
      installationHandle,
      `automaticRefund installationHandle stored in wallet`,
    );

    const autoswapInstallationBoardId = await E(board).getId(
      autoswapInstallationHandle,
    );
    await wallet.suggestInstallation('autoswap', autoswapInstallationBoardId);

    t.equals(
      wallet.getInstallation('autoswap'),
      autoswapInstallationHandle,
      `autoswap installationHandle stored in wallet`,
    );

    const zoeInvitePurseState2 = JSON.parse(
      pursesStateChangeLog[pursesStateChangeLog.length - 1],
    )[0];

    t.deepEquals(
      zoeInvitePurseState2,
      {
        brandBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            inviteDesc: 'getRefund',
            handle: {},
            instanceHandle: {},
            installationHandle: {},
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"inviteDesc":"getRefund","handle":{"@qclass":"slot","index":1},"instanceHandle":{"@qclass":"slot","index":2},"installationHandle":{"@qclass":"slot","index":3}}]}',
          slots: [
            { kind: 'brand', petname: 'zoe invite' },
            { kind: 'unnamed', petname: 'unnamed-4' },
            { kind: 'instance', petname: 'automaticRefund' },
            { kind: 'installation', petname: 'automaticRefund' },
          ],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'zoe invite' },
          value: [
            {
              inviteDesc: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instanceHandle: { kind: 'instance', petname: 'automaticRefund' },
              installationHandle: {
                kind: 'installation',
                petname: 'automaticRefund',
              },
            },
          ],
        },
      },
      `zoeInvitePurseState with names`,
    );

    const inboxState1 = JSON.parse(
      inboxStateChangeLog[inboxStateChangeLog.length - 1],
    )[0];
    t.deepEquals(
      inboxState1,
      {
        id: 'unknown#1588645041696',
        inviteHandleBoardId: '15765496',
        instanceHandleBoardId: '15326650',
        installationHandleBoardId: '7279951',
        proposalTemplate: {},
        requestContext: { origin: 'unknown' },
        instancePetname: 'automaticRefund',
        installationPetname: 'automaticRefund',
        proposalForDisplay: { exit: { onDemand: null } },
      },
      `inboxStateChangeLog with names`,
    );

    console.log('EXPECTED ERROR ->>> "petname" not found/');
    t.throws(
      () => wallet.getInstallation('whatever'),
      /"petname" not found/,
      `using a petname that doesn't exist errors`,
    );

    console.log('EXPECTED ERROR ->>> is already in use');
    t.rejects(
      () => wallet.suggestInstallation('autoswap', autoswapInstallationBoardId),
      /is already in use/,
      `using a petname that already exists errors`,
    );

    wallet.renameInstallation('automaticRefund2', installationHandle);

    t.equals(
      wallet.getInstallation('automaticRefund2'),
      installationHandle,
      `automaticRefund installationHandle renamed in wallet`,
    );

    // We need this await for the pursesStateChangeLog to be updated
    // by the time we check it.
    // TODO: check the pursesState changes in a less fragile way.
    const currentAmount2 = await E(zoeInvitePurse).getCurrentAmount();
    t.deepEquals(
      currentAmount2.value,
      [
        {
          inviteDesc: 'getRefund',
          handle: inviteHandle2,
          instanceHandle,
          installationHandle,
        },
      ],
      `a single invite in zoe purse`,
    );

    const zoeInvitePurseState3 = JSON.parse(
      pursesStateChangeLog[pursesStateChangeLog.length - 1],
    )[0];

    t.deepEquals(
      zoeInvitePurseState3,
      {
        brandBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            inviteDesc: 'getRefund',
            handle: inviteHandle2,
            instanceHandle,
            installationHandle,
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"inviteDesc":"getRefund","handle":{"@qclass":"slot","index":1},"instanceHandle":{"@qclass":"slot","index":2},"installationHandle":{"@qclass":"slot","index":3}}]}',
          slots: [
            { kind: 'brand', petname: 'zoe invite' },
            { kind: 'unnamed', petname: 'unnamed-4' },
            { kind: 'instance', petname: 'automaticRefund' },
            { kind: 'installation', petname: 'automaticRefund2' },
          ],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'zoe invite' },
          value: [
            {
              inviteDesc: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instanceHandle: { kind: 'instance', petname: 'automaticRefund' },
              installationHandle: {
                kind: 'installation',
                petname: 'automaticRefund2',
              },
            },
          ],
        },
      },
      `zoeInvitePurseState with new names`,
    );
    const inboxState2 = JSON.parse(
      inboxStateChangeLog[inboxStateChangeLog.length - 1],
    )[0];
    t.deepEquals(
      inboxState2,
      {
        id: 'unknown#1588645041696',
        inviteHandleBoardId: '15765496',
        instanceHandleBoardId: '15326650',
        installationHandleBoardId: '7279951',
        proposalTemplate: {},
        requestContext: { origin: 'unknown' },
        instancePetname: 'automaticRefund',
        installationPetname: 'automaticRefund2',
        proposalForDisplay: { exit: { onDemand: null } },
      },
      `inboxStateChangeLog with new names`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

test('lib-wallet offer methods', async t => {
  t.plan(8);
  try {
    const {
      moolaBundle,
      wallet,
      invite,
      zoe,
      board,
      instanceHandle,
      pursesStateChangeLog,
      inboxStateChangeLog,
    } = await setupTest();

    await wallet.addIssuer('moola', moolaBundle.issuer);
    await wallet.makeEmptyPurse('moola', 'Fun budget');
    await wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(100)),
    );

    const inviteIssuer = await E(zoe).getInviteIssuer();
    const {
      value: [{ handle: inviteHandle, installationHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
    await wallet.deposit('Default Zoe invite purse', invite);
    const instanceHandleBoardId = await E(board).getId(instanceHandle);
    const installationHandleBoardId = await E(board).getId(installationHandle);

    const formulateBasicOffer = (id, inviteHandleBoardId) =>
      harden({
        // JSONable ID for this offer.  This is scoped to the origin.
        id,

        inviteHandleBoardId,
        instanceHandleBoardId,
        installationHandleBoardId,

        proposalTemplate: {
          give: {
            Contribution: {
              // The pursePetname identifies which purse we want to use
              pursePetname: 'Fun budget',
              value: 1,
            },
          },
          exit: { onDemand: null },
        },
      });

    const rawId = '1588645041696';
    const id = `unknown#${rawId}`;
    const offer = formulateBasicOffer(rawId, inviteHandleBoardId1);

    await wallet.addOffer(offer);

    t.deepEquals(
      wallet.getOffers(),
      [
        {
          id: 'unknown#1588645041696',
          inviteHandleBoardId: '15765496',
          instanceHandleBoardId: '15326650',
          installationHandleBoardId: '7279951',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { origin: 'unknown' },
          status: undefined,
        },
      ],
      `offer structure`,
    );
    const { outcome, depositedP } = await wallet.acceptOffer(id);
    t.equals(await outcome, 'The offer was accepted', `offer was accepted`);
    await depositedP;
    const offerHandles = wallet.getOfferHandles(harden([id]));
    const offerHandle = wallet.getOfferHandle(id);
    t.equals(
      offerHandle,
      offerHandles[0],
      `both getOfferHandle(s) methods work`,
    );
    const moolaPurse = wallet.getPurse('Fun budget');
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.make(100),
      `moolaPurse balance`,
    );
    const rawId2 = '1588645230204';
    const id2 = `unknown#${rawId2}`;
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);
    const invite2 = await E(publicAPI).makeInvite();
    const {
      value: [{ handle: inviteHandle2 }],
    } = await E(inviteIssuer).getAmountOf(invite2);
    const inviteHandleBoardId2 = await E(board).getId(inviteHandle2);
    const offer2 = formulateBasicOffer(rawId2, inviteHandleBoardId2);
    await wallet.deposit('Default Zoe invite purse', invite2);
    // `addOffer` withdraws the invite from the Zoe invite purse.
    await wallet.addOffer(offer2);
    await wallet.declineOffer(id2);
    // TODO: test cancelOffer with a contract that holds offers, like
    // simpleExchange
    const zoeInvitePurse = await E(wallet).getPurse('Default Zoe invite purse');
    const zoePurseAmount = await E(zoeInvitePurse).getCurrentAmount();
    t.deepEquals(zoePurseAmount.value, [], `zoeInvitePurse balance`);
    const lastPurseState = JSON.parse(pursesStateChangeLog.pop());
    const [zoeInvitePurseState, moolaPurseState] = lastPurseState;
    t.deepEquals(
      zoeInvitePurseState,
      {
        brandBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [],
        currentAmountSlots: {
          body: '{"brand":{"@qclass":"slot","index":0},"value":[]}',
          slots: [{ kind: 'brand', petname: 'zoe invite' }],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'zoe invite' },
          value: [],
        },
      },
      `zoeInvitePurseState`,
    );
    t.deepEquals(
      moolaPurseState,
      {
        brandBoardId: '16679794',
        brandPetname: 'moola',
        pursePetname: 'Fun budget',
        value: 100,
        currentAmountSlots: {
          body: '{"brand":{"@qclass":"slot","index":0},"value":100}',
          slots: [{ kind: 'brand', petname: 'moola' }],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'moola' },
          value: 100,
        },
      },
      `moolaPurseState`,
    );
    const lastInboxState = JSON.parse(inboxStateChangeLog.pop());
    t.deepEquals(
      lastInboxState,
      [
        {
          id: 'unknown#1588645041696',
          inviteHandleBoardId: '15765496',
          instanceHandleBoardId: '15326650',
          installationHandleBoardId: '7279951',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { origin: 'unknown' },
          status: 'accept',
          instancePetname: 'unnamed-2',
          installationPetname: 'unnamed-3',
          proposalForDisplay: {
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                amount: {
                  brand: {
                    kind: 'brand',
                    petname: 'moola',
                  },
                  value: 1,
                },
              },
            },
            exit: { onDemand: null },
          },
        },
        {
          id: 'unknown#1588645230204',
          inviteHandleBoardId: '3715714',
          instanceHandleBoardId: '15326650',
          installationHandleBoardId: '7279951',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { origin: 'unknown' },
          status: 'decline',
          instancePetname: 'unnamed-2',
          installationPetname: 'unnamed-3',
          proposalForDisplay: {
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                amount: {
                  brand: {
                    kind: 'brand',
                    petname: 'moola',
                  },
                  value: 1,
                },
              },
            },
            exit: { onDemand: null },
          },
        },
      ],
      `inboxStateChangeLog`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

test('lib-wallet addOffer for autoswap swap', async t => {
  t.plan(4);
  try {
    const {
      zoe,
      moolaBundle,
      simoleanBundle,
      wallet,
      addLiquidityInvite,
      autoswapInstanceHandle,
      autoswapInstallationHandle,
      board,
    } = await setupTest();

    await wallet.addIssuer('moola', moolaBundle.issuer);
    await wallet.makeEmptyPurse('moola', 'Fun budget');
    await wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(1000)),
    );

    await wallet.addIssuer('simolean', simoleanBundle.issuer);
    await wallet.makeEmptyPurse('simolean', 'Nest egg');
    await wallet.deposit(
      'Nest egg',
      simoleanBundle.mint.mintPayment(simoleanBundle.amountMath.make(1000)),
    );

    const { publicAPI } = await E(zoe).getInstanceRecord(
      autoswapInstanceHandle,
    );

    const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

    const getLocalAmountMath = issuer =>
      Promise.all([
        E(issuer).getBrand(),
        E(issuer).getMathHelpersName(),
      ]).then(([brand, mathHelpersName]) =>
        makeAmountMath(brand, mathHelpersName),
      );
    const liquidityAmountMath = await getLocalAmountMath(liquidityIssuer);

    // Let's add liquidity using our wallet and the addLiquidityInvite
    // we have.
    const proposal = harden({
      give: {
        TokenA: moolaBundle.amountMath.make(900),
        TokenB: simoleanBundle.amountMath.make(500),
      },
      want: {
        Liquidity: liquidityAmountMath.getEmpty(),
      },
    });

    const pursesArray = await E(wallet).getPurses();
    const purses = new Map(pursesArray);

    const moolaPurse = purses.get('Fun budget');
    const simoleanPurse = purses.get('Nest egg');

    const moolaPayment = await E(moolaPurse).withdraw(proposal.give.TokenA);
    const simoleanPayment = await E(simoleanPurse).withdraw(
      proposal.give.TokenB,
    );

    const payments = harden({
      TokenA: moolaPayment,
      TokenB: simoleanPayment,
    });
    const { outcome: addLiqOutcome } = await E(zoe).offer(
      addLiquidityInvite,
      proposal,
      payments,
    );
    await addLiqOutcome;

    const invite = await E(publicAPI).makeSwapInvite();
    const inviteIssuer = await E(zoe).getInviteIssuer();
    const {
      value: [{ handle: inviteHandle }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const inviteHandleBoardId = await E(board).getId(inviteHandle);

    // add inviteIssuer and create invite purse
    await wallet.deposit('Default Zoe invite purse', invite);

    const rawId = '1593482020370';
    const id = `unknown#${rawId}`;

    const instanceHandleBoardId = await E(board).getId(autoswapInstanceHandle);
    const installationHandleBoardId = await E(board).getId(
      autoswapInstallationHandle,
    );

    const offer = {
      id: rawId,
      inviteHandleBoardId,
      instanceHandleBoardId,
      installationHandleBoardId,
      proposalTemplate: {
        give: {
          In: {
            pursePetname: 'Fun budget',
            value: 30,
          },
        },
        want: {
          Out: {
            pursePetname: 'Nest egg',
            value: 1,
          },
        },
        exit: {
          onDemand: null,
        },
      },
    };

    await wallet.addOffer(offer);

    const { outcome, depositedP } = await wallet.acceptOffer(id);
    t.equals(
      await outcome,
      'Swap successfully completed.',
      `offer was accepted`,
    );
    await depositedP;
    const offerHandles = wallet.getOfferHandles(harden([id]));
    const offerHandle = wallet.getOfferHandle(id);
    t.equals(
      offerHandle,
      offerHandles[0],
      `both getOfferHandle(s) methods work`,
    );
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.make(70),
      `moola purse balance`,
    );
    t.deepEquals(
      await simoleanPurse.getCurrentAmount(),
      simoleanBundle.amountMath.make(516),
      `simolean purse balance`,
    );
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});
