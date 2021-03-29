/* global require */
// @ts-check
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, makeLocalAmountMath } from '@agoric/ertp';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeRegistrar } from '@agoric/registrar';

import { assert } from '@agoric/assert';
import { E } from '@agoric/eventual-send';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeBoard } from '@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board';
import { makeWallet } from '../src/lib-wallet';

import '../src/types';

const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

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
    Central: moolaBundle.issuer,
    Secondary: simoleanBundle.issuer,
  });
  const {
    publicFacet: autoswapPublicFacet,
    instance: autoswapInstanceHandle,
  } = await zoe.startInstance(
    autoswapInstallationHandle,
    autoswapIssuerKeywordRecord,
  );

  const addLiquidityInvite = await autoswapPublicFacet.makeAddLiquidityInvitation();

  const { admin: wallet, initialized } = makeWallet({
    zoe,
    board,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  });
  await initialized;
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

/**
 * Run a thunk and wait for the notifier to fire.
 *
 * @param {ERef<Notifier<any>>} notifier
 * @param {() => Promise<any>} thunk
 */
const waitForUpdate = async (notifier, thunk) => {
  const { updateCount } = await E(notifier).getUpdateSince();
  await thunk();
  return E(notifier).getUpdateSince(updateCount);
};

test('lib-wallet issuer and purse methods', async t => {
  t.plan(11);
  const {
    zoe,
    moolaBundle,
    rpgBundle,
    wallet,
    inboxStateChangeLog,
    pursesStateChangeLog,
  } = await setupTest();
  const inviteIssuer = await E(zoe).getInvitationIssuer();
  t.deepEqual(
    wallet.getIssuers(),
    [['zoe invite', inviteIssuer]],
    `wallet starts off with only the zoe invite issuer`,
  );
  await wallet.addIssuer('moola', moolaBundle.issuer);
  await wallet.addIssuer('rpg', rpgBundle.issuer);
  t.deepEqual(
    wallet.getIssuers(),
    [
      ['zoe invite', inviteIssuer],
      ['moola', moolaBundle.issuer],
      ['rpg', rpgBundle.issuer],
    ],
    `two issuers added`,
  );
  const issuersMap = new Map(wallet.getIssuers());
  t.is(
    issuersMap.get('moola'),
    moolaBundle.issuer,
    `can get issuer by issuer petname`,
  );

  const invitePurse = wallet.getPurse(ZOE_INVITE_PURSE_PETNAME);
  t.deepEqual(
    wallet.getPurses(),
    [['Default Zoe invite purse', invitePurse]],
    `starts off with only the invite purse`,
  );
  await wallet.makeEmptyPurse('moola', 'fun money');
  const moolaPurse = wallet.getPurse('fun money');
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.getEmpty(),
    `empty purse is empty`,
  );
  t.deepEqual(
    wallet.getPurses(),
    [
      ['Default Zoe invite purse', invitePurse],
      ['fun money', moolaPurse],
    ],
    `two purses currently`,
  );
  t.deepEqual(
    wallet.getPurseIssuer('fun money'),
    moolaBundle.issuer,
    `can get issuer from purse petname`,
  );
  const moolaPayment = moolaBundle.mint.mintPayment(
    moolaBundle.amountMath.make(100n),
  );
  await waitForUpdate(E(moolaPurse).getCurrentAmountNotifier(), () =>
    wallet.deposit('fun money', moolaPayment),
  );
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(100n),
    `deposit successful`,
  );
  t.is(pursesStateChangeLog.length, 6, `pursesStateChangeLog length`);
  const purseLog = JSON.parse(
    pursesStateChangeLog[pursesStateChangeLog.length - 1],
  );
  t.deepEqual(
    purseLog,
    [
      {
        brand: purseLog[0].brand,
        brandBoardId: '1667979430',
        depositBoardId: '604346717',
        displayInfo: {
          amountMathKind: 'set',
        },
        brandPetname: 'zoe invite',
        pursePetname: 'Default Zoe invite purse',
        value: [],
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[]}',
          slots: [{ kind: 'brand', petname: 'zoe invite' }],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'zoe invite' },
          value: [],
        },
      },
      {
        brand: purseLog[1].brand,
        brandBoardId: '727995140',
        brandPetname: 'moola',
        displayInfo: {
          amountMathKind: 'nat',
        },
        pursePetname: 'fun money',
        value: 100,
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":{"@qclass":"bigint","digits":"100"}}',
          slots: [{ kind: 'brand', petname: 'moola' }],
        },
        currentAmount: {
          brand: { kind: 'brand', petname: 'moola' },
          value: 100,
        },
      },
    ],
    `pursesStateChangeLog`,
  );
  t.deepEqual(inboxStateChangeLog, [], `inboxStateChangeLog`);
});

test('lib-wallet dapp suggests issuer, instance, installation petnames', async t => {
  t.plan(13);
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

  t.is(
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
  const invitationAmount = await E(inviteIssuer).getAmountOf(invite);
  const invitationAmountValue = invitationAmount.value;
  assert(Array.isArray(invitationAmountValue));
  const [{ handle: inviteHandle, installation }] = invitationAmountValue;
  const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
  await wallet.deposit('Default Zoe invite purse', invite);

  const formulateBasicOffer = (id, inviteHandleBoardId) =>
    harden({
      // JSONable ID for this offer.  This is scoped to the origin.
      id,

      inviteHandleBoardId,

      proposalTemplate: {},
    });

  const rawId = '1588645041696';
  const offer = formulateBasicOffer(rawId, inviteHandleBoardId1);

  await wallet.addOffer(offer);

  // Deposit a zoe invite in the wallet so that we can see how the
  // invite purse balance is rendered with petnames. We should see
  // unnamed first, then the petnames after those are suggested by
  // the dapp.
  /** @type {{ makeInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(instance);
  const invite2 = await E(publicAPI).makeInvitation();
  const invitationAmount2 = await E(inviteIssuer).getAmountOf(invite2);
  const invitationAmountValue2 = invitationAmount2.value;
  assert(Array.isArray(invitationAmountValue2));
  const [{ handle: inviteHandle2 }] = invitationAmountValue2;

  await waitForUpdate(E(zoeInvitePurse).getCurrentAmountNotifier(), () =>
    wallet.deposit('Default Zoe invite purse', invite2),
  );

  const currentAmount = await E(zoeInvitePurse).getCurrentAmount();
  t.deepEqual(
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
  t.deepEqual(
    zoeInvitePurseState[0],
    {
      brand: zoeInvitePurseState[0].brand,
      brandBoardId: '1667979430',
      depositBoardId: '604346717',
      displayInfo: {
        amountMathKind: 'set',
      },

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
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","iface":"Alleged: InvitationHandle","index":1},"installation":{"@qclass":"slot","iface":"Alleged: Installation","index":2},"instance":{"@qclass":"slot","iface":"Alleged: InstanceHandle","index":3}}]}',
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
            installation: { kind: 'unnamed', petname: 'unnamed-2' },
            instance: { kind: 'unnamed', petname: 'unnamed-3' },
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

  t.is(
    wallet.getInstance('automaticRefund'),
    instance,
    `automaticRefund instance stored in wallet`,
  );

  const automaticRefundInstallationBoardId = await E(board).getId(installation);
  await wallet.suggestInstallation(
    'automaticRefund',
    automaticRefundInstallationBoardId,
  );

  t.is(
    wallet.getInstallation('automaticRefund'),
    installation,
    `automaticRefund installation stored in wallet`,
  );

  const autoswapInstallationBoardId = await E(board).getId(
    autoswapInstallationHandle,
  );
  await wallet.suggestInstallation('autoswap', autoswapInstallationBoardId);

  t.is(
    wallet.getInstallation('autoswap'),
    autoswapInstallationHandle,
    `autoswap installation stored in wallet`,
  );

  const zoeInvitePurseState2 = JSON.parse(
    pursesStateChangeLog[pursesStateChangeLog.length - 1],
  )[0];

  t.deepEqual(
    zoeInvitePurseState2,
    {
      brand: zoeInvitePurseState2.brand,
      brandBoardId: '1667979430',
      depositBoardId: '604346717',
      displayInfo: {
        amountMathKind: 'set',
      },
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
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","iface":"Alleged: InvitationHandle","index":1},"installation":{"@qclass":"slot","iface":"Alleged: Installation","index":2},"instance":{"@qclass":"slot","iface":"Alleged: InstanceHandle","index":3}}]}',
        slots: [
          { kind: 'brand', petname: 'zoe invite' },
          { kind: 'unnamed', petname: 'unnamed-4' },
          { kind: 'installation', petname: 'automaticRefund' },
          { kind: 'instance', petname: 'automaticRefund' },
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
  t.deepEqual(
    inboxState1,
    {
      id: 'unknown#1588645041696',
      rawId: '1588645041696',
      inviteHandleBoardId: '727995140',
      proposalTemplate: {},
      requestContext: { dappOrigin: 'unknown' },
      instancePetname: 'automaticRefund',
      installationPetname: 'automaticRefund',
      proposalForDisplay: { exit: { onDemand: null } },
    },
    `inboxStateChangeLog with names`,
  );

  t.throws(
    () => wallet.getInstallation('whatever'),
    {
      message:
        // Should be able to use more informative error once SES double
        // disclosure bug is fixed. See
        // https://github.com/endojs/endo/pull/640
        //
        // /"petname" not found/
        /.* not found/,
    },
    `using a petname that doesn't exist errors`,
  );

  // `resuggesting a petname doesn't error`
  await wallet.suggestInstallation('autoswap', autoswapInstallationBoardId);
  await wallet.renameInstallation('automaticRefund2', installation);

  t.is(
    wallet.getInstallation('automaticRefund2'),
    installation,
    `automaticRefund installation renamed in wallet`,
  );

  // We need this await for the pursesStateChangeLog to be updated
  // by the time we check it.
  const currentAmount2 = await E(zoeInvitePurse).getCurrentAmount();
  t.deepEqual(
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

  t.deepEqual(
    zoeInvitePurseState3,
    {
      brand: zoeInvitePurseState3.brand,
      brandBoardId: '1667979430',
      depositBoardId: '604346717',
      displayInfo: {
        amountMathKind: 'set',
      },
      brandPetname: 'zoe invite',
      pursePetname: 'Default Zoe invite purse',
      value: [
        {
          description: 'getRefund',

          // See https://github.com/Agoric/agoric-sdk/issues/2207
          // handle: inviteHandle2,
          // instance,
          handle: {},
          instance: {},

          installation: {},
        },
      ],
      currentAmountSlots: {
        body:
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","iface":"Alleged: InvitationHandle","index":1},"installation":{"@qclass":"slot","iface":"Alleged: Installation","index":2},"instance":{"@qclass":"slot","iface":"Alleged: InstanceHandle","index":3}}]}',
        slots: [
          { kind: 'brand', petname: 'zoe invite' },
          { kind: 'unnamed', petname: 'unnamed-4' },
          { kind: 'installation', petname: 'automaticRefund2' },
          { kind: 'instance', petname: 'automaticRefund' },
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
  t.deepEqual(
    inboxState2,
    {
      id: 'unknown#1588645041696',
      rawId: '1588645041696',
      inviteHandleBoardId: '727995140',
      proposalTemplate: {},
      requestContext: { dappOrigin: 'unknown' },
      instancePetname: 'automaticRefund',
      installationPetname: 'automaticRefund2',
      proposalForDisplay: { exit: { onDemand: null } },
    },
    `inboxStateChangeLog with new names`,
  );
});

test('lib-wallet offer methods', async t => {
  t.plan(7);
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
  const moolaPurse = wallet.getPurse('Fun budget');

  await waitForUpdate(E(moolaPurse).getCurrentAmountNotifier(), () =>
    wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(100n)),
    ),
  );

  const inviteIssuer = await E(zoe).getInvitationIssuer();
  const invitationAmount = await E(inviteIssuer).getAmountOf(invite);
  const invitationAmountValue = invitationAmount.value;
  assert(Array.isArray(invitationAmountValue));
  const [{ handle: inviteHandle, installation }] = invitationAmountValue;
  const inviteHandleBoardId1 = await E(board).getId(inviteHandle);
  await wallet.deposit('Default Zoe invite purse', invite);

  const formulateBasicOffer = (id, inviteHandleBoardId) =>
    harden({
      // JSONable ID for this offer.  This is scoped to the origin.
      id,

      inviteHandleBoardId,

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

  t.deepEqual(
    wallet.getOffers(),
    [
      {
        id: 'unknown#1588645041696',
        rawId: '1588645041696',
        inviteHandleBoardId: '727995140',
        instance,
        installation,
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
  const { depositedP } = accepted;
  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(100n),
    `moolaPurse balance`,
  );
  const rawId2 = '1588645230204';
  const id2 = `unknown#${rawId2}`;
  /** @type {{ makeInvitation: () => Invitation}} */
  const publicAPI = await E(zoe).getPublicFacet(instance);
  const invite2 = await E(publicAPI).makeInvitation();
  const invitationAmount2 = await E(inviteIssuer).getAmountOf(invite2);
  const invitationAmountValue2 = invitationAmount2.value;
  assert(Array.isArray(invitationAmountValue2));
  const [{ handle: inviteHandle2 }] = invitationAmountValue2;
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
  t.deepEqual(zoePurseAmount.value, [], `zoeInvitePurse balance`);
  const lastPurseState = JSON.parse(pursesStateChangeLog.pop());
  const [zoeInvitePurseState, moolaPurseState] = lastPurseState;
  t.deepEqual(
    zoeInvitePurseState,
    {
      brand: zoeInvitePurseState.brand,
      brandBoardId: '1667979430',
      depositBoardId: '604346717',
      brandPetname: 'zoe invite',
      displayInfo: {
        amountMathKind: 'set',
      },
      pursePetname: 'Default Zoe invite purse',
      value: [],
      currentAmountSlots: {
        body:
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[]}',
        slots: [{ kind: 'brand', petname: 'zoe invite' }],
      },
      currentAmount: {
        brand: { kind: 'brand', petname: 'zoe invite' },
        value: [],
      },
    },
    `zoeInvitePurseState`,
  );
  t.deepEqual(
    moolaPurseState,
    {
      brand: moolaPurseState.brand,
      brandBoardId: '1532665031',
      brandPetname: 'moola',
      displayInfo: {
        amountMathKind: 'nat',
      },
      pursePetname: 'Fun budget',
      value: 100,
      currentAmountSlots: {
        body:
          '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":{"@qclass":"bigint","digits":"100"}}',
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
  t.deepEqual(
    lastInboxState,
    [
      {
        id: 'unknown#1588645041696',
        rawId: '1588645041696',
        inviteHandleBoardId: '727995140',
        proposalTemplate: {
          give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
          exit: { onDemand: null },
        },
        requestContext: { dappOrigin: 'unknown' },
        status: 'accept',
        instancePetname: 'unnamed-3',
        installationPetname: 'unnamed-2',
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
                displayInfo: {
                  amountMathKind: 'nat',
                },
              },
            },
          },
          exit: { onDemand: null },
        },
      },
      {
        id: 'unknown#1588645230204',
        rawId: '1588645230204',
        inviteHandleBoardId: '371571443',
        proposalTemplate: {
          give: { Contribution: { pursePetname: 'Fun budget', value: 1 } },
          exit: { onDemand: null },
        },
        requestContext: { dappOrigin: 'unknown' },
        status: 'decline',
        instancePetname: 'unnamed-3',
        installationPetname: 'unnamed-2',
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
                displayInfo: {
                  amountMathKind: 'nat',
                },
              },
            },
          },
          exit: { onDemand: null },
        },
      },
    ],
    `inboxStateChangeLog`,
  );
});

test('lib-wallet addOffer for autoswap swap', async t => {
  t.plan(4);
  const {
    zoe,
    moolaBundle,
    simoleanBundle,
    wallet,
    addLiquidityInvite,
    autoswapInstanceHandle,
    board,
  } = await setupTest();

  await wallet.addIssuer('moola', moolaBundle.issuer);
  await wallet.makeEmptyPurse('moola', 'Fun budget');
  await wallet.deposit(
    'Fun budget',
    moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(1000n)),
  );

  await wallet.addIssuer('simolean', simoleanBundle.issuer);
  await wallet.makeEmptyPurse('simolean', 'Nest egg');
  await wallet.deposit(
    'Nest egg',
    simoleanBundle.mint.mintPayment(simoleanBundle.amountMath.make(1000n)),
  );

  /** @type {{ getLiquidityIssuer: () => Issuer, makeSwapInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(autoswapInstanceHandle);
  const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

  const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuer);

  // Let's add liquidity using our wallet and the addLiquidityInvite
  // we have.
  const proposal = harden({
    give: {
      Central: moolaBundle.amountMath.make(900n),
      Secondary: simoleanBundle.amountMath.make(500n),
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

  const moolaPayment = await E(moolaPurse).withdraw(proposal.give.Central);
  const simoleanPayment = await E(simoleanPurse).withdraw(
    proposal.give.Secondary,
  );

  const payments = harden({
    Central: moolaPayment,
    Secondary: simoleanPayment,
  });
  const liqSeat = await E(zoe).offer(addLiquidityInvite, proposal, payments);
  await E(liqSeat).getOfferResult();

  const invite = await E(publicAPI).makeSwapInvitation();
  const inviteIssuer = await E(zoe).getInvitationIssuer();
  const invitationAmount = await E(inviteIssuer).getAmountOf(invite);
  const invitationAmountValue = invitationAmount.value;
  assert(Array.isArray(invitationAmountValue));
  const [{ handle: inviteHandle }] = invitationAmountValue;
  const inviteHandleBoardId = await E(board).getId(inviteHandle);

  // add inviteIssuer and create invite purse
  await wallet.deposit('Default Zoe invite purse', invite);

  const rawId = '1593482020370';
  const id = `unknown#${rawId}`;

  const offer = {
    id: rawId,
    inviteHandleBoardId,
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
  const { depositedP } = accepted;
  await t.throwsAsync(() => wallet.getUINotifier(rawId, `unknown`), {
    message: 'offerResult must be a record to have a uiNotifier',
  });

  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(70n),
    `moola purse balance`,
  );
  t.deepEqual(
    await simoleanPurse.getCurrentAmount(),
    simoleanBundle.amountMath.make(516n),
    `simolean purse balance`,
  );
});

test('addOffer invitationQuery', async t => {
  const {
    zoe,
    moolaBundle,
    simoleanBundle,
    wallet,
    addLiquidityInvite,
    autoswapInstanceHandle,
  } = await setupTest();

  const issuerManager = wallet.getIssuerManager();
  await issuerManager.add('moola', moolaBundle.issuer);
  await wallet.makeEmptyPurse('moola', 'Fun budget');
  await wallet.deposit(
    'Fun budget',
    moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(1000n)),
  );

  await issuerManager.add('simolean', simoleanBundle.issuer);
  await wallet.makeEmptyPurse('simolean', 'Nest egg');
  await wallet.deposit(
    'Nest egg',
    simoleanBundle.mint.mintPayment(simoleanBundle.amountMath.make(1000n)),
  );

  /** @type {{ getLiquidityIssuer: () => Issuer, makeSwapInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(autoswapInstanceHandle);
  const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

  const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuer);

  // Let's add liquidity using our wallet and the addLiquidityInvite
  // we have.
  const proposal = harden({
    give: {
      Central: moolaBundle.amountMath.make(900n),
      Secondary: simoleanBundle.amountMath.make(500n),
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

  const moolaPayment = await E(moolaPurse).withdraw(proposal.give.Central);
  const simoleanPayment = await E(simoleanPurse).withdraw(
    proposal.give.Secondary,
  );

  const payments = harden({
    Central: moolaPayment,
    Secondary: simoleanPayment,
  });
  const liqSeat = await E(zoe).offer(addLiquidityInvite, proposal, payments);
  await E(liqSeat).getOfferResult();

  const swapInvitation = await E(publicAPI).makeSwapInvitation();
  const zoeInvitePurse = purses.get('Default Zoe invite purse');
  assert(zoeInvitePurse);

  await E(zoeInvitePurse).deposit(swapInvitation);

  const rawId = '1593482020370';
  const id = `unknown#${rawId}`;

  const offer = {
    id: rawId,
    invitationQuery: {
      instance: autoswapInstanceHandle,
      description: 'autoswap swap',
    },
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
  const { depositedP } = accepted;
  await t.throwsAsync(() => wallet.getUINotifier(rawId, `unknown`), {
    message: 'offerResult must be a record to have a uiNotifier',
  });

  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(70n),
    `moola purse balance`,
  );
  t.deepEqual(
    await simoleanPurse.getCurrentAmount(),
    simoleanBundle.amountMath.make(516n),
    `simolean purse balance`,
  );
});

test('addOffer offer.invitation', async t => {
  const {
    zoe,
    moolaBundle,
    simoleanBundle,
    wallet,
    addLiquidityInvite,
    autoswapInstanceHandle,
  } = await setupTest();

  const issuerManager = wallet.getIssuerManager();
  await issuerManager.add('moola', moolaBundle.issuer);
  await wallet.makeEmptyPurse('moola', 'Fun budget');
  await wallet.deposit(
    'Fun budget',
    moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(1000n)),
  );

  await issuerManager.add('simolean', simoleanBundle.issuer);
  await wallet.makeEmptyPurse('simolean', 'Nest egg');
  await wallet.deposit(
    'Nest egg',
    simoleanBundle.mint.mintPayment(simoleanBundle.amountMath.make(1000n)),
  );

  /** @type {{ getLiquidityIssuer: () => Issuer, makeSwapInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(autoswapInstanceHandle);
  const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

  const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuer);

  // Let's add liquidity using our wallet and the addLiquidityInvite
  // we have.
  const proposal = harden({
    give: {
      Central: moolaBundle.amountMath.make(900n),
      Secondary: simoleanBundle.amountMath.make(500n),
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

  const moolaPayment = await E(moolaPurse).withdraw(proposal.give.Central);
  const simoleanPayment = await E(simoleanPurse).withdraw(
    proposal.give.Secondary,
  );

  const payments = harden({
    Central: moolaPayment,
    Secondary: simoleanPayment,
  });
  const liqSeat = await E(zoe).offer(addLiquidityInvite, proposal, payments);
  await E(liqSeat).getOfferResult();

  const swapInvitation = await E(publicAPI).makeSwapInvitation();

  const rawId = '1593482020370';
  const id = `unknown#${rawId}`;

  const offer = {
    id: rawId,
    invitation: swapInvitation,
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
  const { depositedP } = accepted;
  await t.throwsAsync(() => wallet.getUINotifier(rawId, `unknown`), {
    message: 'offerResult must be a record to have a uiNotifier',
  });

  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(70n),
    `moola purse balance`,
  );
  t.deepEqual(
    await simoleanPurse.getCurrentAmount(),
    simoleanBundle.amountMath.make(516n),
    `simolean purse balance`,
  );
});

test('addOffer makeContinuingInvitation', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const board = makeBoard();

  // Create ContinuingInvitationExample instance
  const path = require.resolve('./continuingInvitationExample.js');
  const bundle = await bundleSource(path);
  const installation = await zoe.install(bundle);
  const { creatorInvitation, instance } = await zoe.startInstance(installation);
  assert(creatorInvitation);

  const pursesStateChangeLog = [];
  const inboxStateChangeLog = [];
  const pursesStateChangeHandler = data => {
    pursesStateChangeLog.push(data);
  };
  const inboxStateChangeHandler = data => {
    inboxStateChangeLog.push(data);
  };

  const { admin: wallet, initialized } = makeWallet({
    zoe,
    board,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  });
  await initialized;

  // deposit creatorInvitation
  const invitationPurse = E(wallet).getPurse(ZOE_INVITE_PURSE_PETNAME);
  await E(invitationPurse).deposit(creatorInvitation);

  // Make the first offer
  const rawId = '1593482020370';
  const id = `unknown#${rawId}`;

  const offer = {
    id: rawId,
    invitationQuery: {
      instance,
      description: 'FirstThing',
    },
    proposalTemplate: harden({}),
  };

  await wallet.addOffer(offer);

  const uiNotifierP = wallet.getUINotifier(rawId, `unknown`);

  const accepted = await wallet.acceptOffer(id);
  assert(accepted);

  const update = await E(uiNotifierP).getUpdateSince();
  t.is(update.value, 'first offer made');

  // make the second offer
  const rawId2 = '1593482020371';
  const id2 = `unknown#${rawId2}`;

  const offer2 = {
    id: rawId2,
    continuingInvitation: {
      priorOfferId: rawId,
      description: 'SecondThing',
    },
    proposalTemplate: harden({}),
  };

  await wallet.addOffer(offer2);
  const accepted2 = await wallet.acceptOffer(id2);
  assert(accepted2);

  const update2 = await E(uiNotifierP).getUpdateSince(update.updateCount);

  t.is(update2.value, 'second offer made');
});

test('getZoe, getBoard', async t => {
  const zoe = makeZoe(fakeVatAdmin);
  const board = makeBoard();

  const pursesStateChangeHandler = _data => {};
  const inboxStateChangeHandler = _data => {};

  const { admin: wallet, initialized } = makeWallet({
    zoe,
    board,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  });
  await initialized;

  t.is(await E(wallet).getZoe(), zoe);
  t.is(await E(wallet).getBoard(), board);
});
