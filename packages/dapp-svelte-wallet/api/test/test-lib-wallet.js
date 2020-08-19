// @ts-check
import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, makeLocalAmountMath } from '@agoric/ertp';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/test/unitTests/contracts/fakeVatAdmin';
import { makeRegistrar } from '@agoric/registrar';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
import { makeBoard } from '@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board';
import { makeWallet } from '../src/lib-wallet';

import '../src/types';

async function setupTest() {
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
  const installation = await zoe.install(automaticRefundBundle);
  const issuerKeywordRecord = harden({ Contribution: moolaBundle.issuer });
  const { creatorInvitation: invite, instance } = await zoe.startInstance(
    installation,
    issuerKeywordRecord,
  );
  assert(invite);

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
    publicFacet: autoswapPublicFacet,
    instance: autoswapInstanceHandle,
  } = await zoe.startInstance(
    autoswapInstallationHandle,
    autoswapIssuerKeywordRecord,
  );

  const addLiquidityInvite = await autoswapPublicFacet.makeAddLiquidityInvitation();

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
    installation,
    instance,
    autoswapInstanceHandle,
    autoswapInstallationHandle,
    pursesStateChangeLog,
    inboxStateChangeLog,
  };
}

test('lib-wallet issuer and purse methods', async t => {
  t.plan(11);
  try {
    const {
      zoe,
      moolaBundle,
      rpgBundle,
      wallet,
      inboxStateChangeLog,
      pursesStateChangeLog,
    } = await setupTest();
    const inviteIssuer = await E(zoe).getInvitationIssuer();
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
    t.equals(pursesStateChangeLog.length, 4, `pursesStateChangeLog length`);
    t.deepEquals(
      JSON.parse(pursesStateChangeLog[pursesStateChangeLog.length - 1]),
      [
        {
          brandBoardId: '16679794',
          depositBoardId: '6043467',
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
        {
          brandBoardId: '7279951',
          brandPetname: 'moola',
          pursePetname: 'fun money',
          value: 0,
          currentAmountSlots: {
            body: '{"brand":{"@qclass":"slot","index":0},"value":0}',
            slots: [{ kind: 'brand', petname: 'moola' }],
          },
          currentAmount: {
            brand: { kind: 'brand', petname: 'moola' },
            value: 0,
          },
        },
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
      instance,
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
    const inviteIssuer = await E(zoe).getInvitationIssuer();
    const zoeInvitePurse = await E(wallet).getPurse('Default Zoe invite purse');
    const {
      value: [{ handle: inviteHandle, installation }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
    await wallet.deposit('Default Zoe invite purse', invite);

    const instanceHandleBoardId = await E(board).getId(instance);
    const installationHandleBoardId = await E(board).getId(installation);

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
    /** @type {{ makeInvitation(): Invitation }} */
    const publicAPI = await E(zoe).getPublicFacet(instance);
    const invite2 = await E(publicAPI).makeInvitation();
    const {
      value: [{ handle: inviteHandle2 }],
    } = await E(inviteIssuer).getAmountOf(invite2);
    await wallet.deposit('Default Zoe invite purse', invite2);

    const currentAmount = await E(zoeInvitePurse).getCurrentAmount();
    t.deepEquals(
      currentAmount.value,
      [
        {
          description: 'getRefund',
          handle: inviteHandle2,
          instance,
          installation,
        },
      ],
      `a single invite in zoe purse`,
    );

    const zoeInvitePurseState = JSON.parse(
      pursesStateChangeLog[pursesStateChangeLog.length - 1],
    );
    t.deepEquals(
      zoeInvitePurseState[0],
      {
        brandBoardId: '16679794',
        depositBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            description: 'getRefund',
            handle: {},
            instance: {},
            installation: {},
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
              description: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instance: { kind: 'unnamed', petname: 'unnamed-2' },
              installation: { kind: 'unnamed', petname: 'unnamed-3' },
            },
          ],
        },
      },
      `zoeInvitePurseState with no names and invite2`,
    );

    const automaticRefundInstanceBoardId = await E(board).getId(instance);
    await wallet.suggestInstance(
      'automaticRefund',
      automaticRefundInstanceBoardId,
    );

    t.equals(
      wallet.getInstance('automaticRefund'),
      instance,
      `automaticRefund instance stored in wallet`,
    );

    const automaticRefundInstallationBoardId = await E(board).getId(
      installation,
    );
    await wallet.suggestInstallation(
      'automaticRefund',
      automaticRefundInstallationBoardId,
    );

    t.equals(
      wallet.getInstallation('automaticRefund'),
      installation,
      `automaticRefund installation stored in wallet`,
    );

    const autoswapInstallationBoardId = await E(board).getId(
      autoswapInstallationHandle,
    );
    await wallet.suggestInstallation('autoswap', autoswapInstallationBoardId);

    t.equals(
      wallet.getInstallation('autoswap'),
      autoswapInstallationHandle,
      `autoswap installation stored in wallet`,
    );

    const zoeInvitePurseState2 = JSON.parse(
      pursesStateChangeLog[pursesStateChangeLog.length - 1],
    )[0];

    t.deepEquals(
      zoeInvitePurseState2,
      {
        brandBoardId: '16679794',
        depositBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            description: 'getRefund',
            handle: {},
            instance: {},
            installation: {},
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
              description: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instance: { kind: 'instance', petname: 'automaticRefund' },
              installation: {
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
        inviteHandleBoardId: '7279951',
        instanceHandleBoardId: '3715714',
        installationHandleBoardId: '14561541',
        proposalTemplate: {},
        requestContext: { dappOrigin: 'unknown' },
        instancePetname: 'automaticRefund',
        installationPetname: 'automaticRefund',
        proposalForDisplay: { exit: { onDemand: null } },
      },
      `inboxStateChangeLog with names`,
    );

    console.log('EXPECTED ERROR ->>> "petname" not found');
    t.throws(
      () => wallet.getInstallation('whatever'),
      /"petname" not found/,
      `using a petname that doesn't exist errors`,
    );

    await t.doesNotReject(
      wallet.suggestInstallation('autoswap', autoswapInstallationBoardId),
      `resuggesting a petname doesn't error`,
    );

    await wallet.renameInstallation('automaticRefund2', installation);

    t.equals(
      wallet.getInstallation('automaticRefund2'),
      installation,
      `automaticRefund installation renamed in wallet`,
    );

    // We need this await for the pursesStateChangeLog to be updated
    // by the time we check it.
    // TODO: check the pursesState changes in a less fragile way.
    const currentAmount2 = await E(zoeInvitePurse).getCurrentAmount();
    t.deepEquals(
      currentAmount2.value,
      [
        {
          description: 'getRefund',
          handle: inviteHandle2,
          instance,
          installation,
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
        brandBoardId: '16679794',
        depositBoardId: '6043467',
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [
          {
            description: 'getRefund',
            handle: inviteHandle2,
            instance,
            installation: {},
          },
        ],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
              description: 'getRefund',
              handle: { kind: 'unnamed', petname: 'unnamed-4' },
              instance: { kind: 'instance', petname: 'automaticRefund' },
              installation: {
                kind: 'installation',
                petname: 'automaticRefund',
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
        inviteHandleBoardId: '7279951',
        instanceHandleBoardId: '3715714',
        installationHandleBoardId: '14561541',
        proposalTemplate: {},
        requestContext: { dappOrigin: 'unknown' },
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
      instance,
      pursesStateChangeLog,
      inboxStateChangeLog,
    } = await setupTest();

    await wallet.addIssuer('moola', moolaBundle.issuer);
    await wallet.makeEmptyPurse('moola', 'Fun budget');
    await wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(100)),
    );

    const inviteIssuer = await E(zoe).getInvitationIssuer();
    const {
      value: [{ handle: inviteHandle, installation }],
    } = await E(inviteIssuer).getAmountOf(invite);
    const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
    await wallet.deposit('Default Zoe invite purse', invite);
    const instanceHandleBoardId = await E(board).getId(instance);
    const installationHandleBoardId = await E(board).getId(installation);

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
          inviteHandleBoardId: '7279951',
          instanceHandleBoardId: '3715714',
          installationHandleBoardId: '14561541',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { dappOrigin: 'unknown' },
          status: undefined,
        },
      ],
      `offer structure`,
    );
    const accepted = await wallet.acceptOffer(id);
    assert(accepted);
    const { outcome, depositedP } = accepted;
    t.equals(await outcome, 'The offer was accepted', `offer was accepted`);
    await depositedP;
    const seats = wallet.getSeats(harden([id]));
    const seat = wallet.getSeat(id);
    t.equals(seat, seats[0], `both getSeat(s) methods work`);
    const moolaPurse = wallet.getPurse('Fun budget');
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.make(100),
      `moolaPurse balance`,
    );
    const rawId2 = '1588645230204';
    const id2 = `unknown#${rawId2}`;
    /** @type {{ makeInvitation(): Invitation}} */
    const publicAPI = await E(zoe).getPublicFacet(instance);
    const invite2 = await E(publicAPI).makeInvitation();
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
        brandBoardId: '16679794',
        depositBoardId: '6043467',
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
        brandBoardId: '15326650',
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
          inviteHandleBoardId: '7279951',
          instanceHandleBoardId: '3715714',
          installationHandleBoardId: '14561541',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { dappOrigin: 'unknown' },
          status: 'accept',
          instancePetname: 'unnamed-2',
          installationPetname: 'unnamed-3',
          proposalForDisplay: {
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                purse: {}, // JSON doesn't keep the purse.
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
          inviteHandleBoardId: '5007165',
          instanceHandleBoardId: '3715714',
          installationHandleBoardId: '14561541',
          proposalTemplate: {
            give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { dappOrigin: 'unknown' },
          status: 'decline',
          instancePetname: 'unnamed-2',
          installationPetname: 'unnamed-3',
          proposalForDisplay: {
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                purse: {}, // JSON doesn't keep the purse.
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

    /** @type {{ getLiquidityIssuer(): Issuer, makeSwapInvitation(): Invitation }} */
    const publicAPI = await E(zoe).getPublicFacet(autoswapInstanceHandle);
    const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

    const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuer);

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
    assert(moolaPurse);
    assert(simoleanPurse);

    const moolaPayment = await E(moolaPurse).withdraw(proposal.give.TokenA);
    const simoleanPayment = await E(simoleanPurse).withdraw(
      proposal.give.TokenB,
    );

    const payments = harden({
      TokenA: moolaPayment,
      TokenB: simoleanPayment,
    });
    const liqSeat = await E(zoe).offer(addLiquidityInvite, proposal, payments);
    await E(liqSeat).getOfferResult();

    const invite = await E(publicAPI).makeSwapInvitation();
    const inviteIssuer = await E(zoe).getInvitationIssuer();
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

    const accepted = await wallet.acceptOffer(id);
    assert(accepted);
    const { outcome, depositedP } = accepted;
    t.equals(
      await outcome,
      'Swap successfully completed.',
      `offer was accepted`,
    );
    await depositedP;
    const seats = wallet.getSeats(harden([id]));
    const seat = wallet.getSeat(id);
    t.equals(seat, seats[0], `both getSeat(s) methods work`);
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
