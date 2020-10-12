// @ts-check
import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';
import bundleSource from '@agoric/bundle-source';
import { makeIssuerKit, makeLocalAmountMath } from '@agoric/ertp';

import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
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

  const ZOE_INVITE_PURSE_PETNAME = 'Default Zoe invite purse';

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
    moolaBundle.amountMath.make(100),
  );
  await wallet.deposit('fun money', moolaPayment);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(100),
    `deposit successful`,
  );
  t.is(pursesStateChangeLog.length, 4, `pursesStateChangeLog length`);
  t.deepEqual(
    JSON.parse(pursesStateChangeLog[pursesStateChangeLog.length - 1]),
    [
      {
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
        brandBoardId: '727995140',
        brandPetname: 'moola',
        displayInfo: {
          amountMathKind: 'nat',
        },
        pursePetname: 'fun money',
        value: 0,
        currentAmountSlots: {
          body:
            '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":0}',
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
  const {
    value: [{ handle: inviteHandle, installation }],
  } = await E(inviteIssuer).getAmountOf(invite);
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

  const { invitedP } = await wallet.addOffer(offer);
  await invitedP;

  // Deposit a zoe invite in the wallet so that we can see how the
  // invite purse balance is rendered with petnames. We should see
  // unnamed first, then the petnames after those are suggested by
  // the dapp.
  /** @type {{ makeInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(instance);
  const invite2 = await E(publicAPI).makeInvitation();
  const {
    value: [{ handle: inviteHandle2 }],
  } = await E(inviteIssuer).getAmountOf(invite2);
  await wallet.deposit('Default Zoe invite purse', invite2);

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
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
  t.deepEqual(
    inboxState1,
    {
      id: 'unknown#1588645041696',
      inviteHandleBoardId: '727995140',
      proposalTemplate: {},
      requestContext: { dappOrigin: 'unknown' },
      instancePetname: 'automaticRefund',
      installation: {},
      installationPetname: 'automaticRefund',
      instance: {},
      proposalForDisplay: { exit: { onDemand: null } },
    },
    `inboxStateChangeLog with names`,
  );

  t.throws(
    () => wallet.getInstallation('whatever'),
    { message: /"petname" not found/ },
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
          handle: inviteHandle2,
          instance,
          installation: {},
        },
      ],
      currentAmountSlots: {
        body:
          '{"brand":{"@qclass":"slot","iface":"Alleged: Zoe Invitation brand","index":0},"value":[{"description":"getRefund","handle":{"@qclass":"slot","index":1},"instance":{"@qclass":"slot","index":2},"installation":{"@qclass":"slot","index":3}}]}',
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
      inviteHandleBoardId: '727995140',
      proposalTemplate: {},
      requestContext: { dappOrigin: 'unknown' },
      instance: {},
      instancePetname: 'automaticRefund',
      installation: {},
      installationPetname: 'automaticRefund2',
      proposalForDisplay: { exit: { onDemand: null } },
    },
    `inboxStateChangeLog with new names`,
  );
});

test('lib-wallet offer methods', async t => {
  t.plan(8);
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

  const { invitedP } = await wallet.addOffer(offer);
  await invitedP;

  t.deepEqual(
    wallet.getOffers(),
    [
      {
        id: 'unknown#1588645041696',
        inviteHandleBoardId: '727995140',
        installation,
        instance,
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
  t.is(await outcome, 'The offer was accepted', `offer was accepted`);
  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  const moolaPurse = wallet.getPurse('Fun budget');
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(100),
    `moolaPurse balance`,
  );
  const rawId2 = '1588645230204';
  const id2 = `unknown#${rawId2}`;
  /** @type {{ makeInvitation: () => Invitation}} */
  const publicAPI = await E(zoe).getPublicFacet(instance);
  const invite2 = await E(publicAPI).makeInvitation();
  const {
    value: [{ handle: inviteHandle2 }],
  } = await E(inviteIssuer).getAmountOf(invite2);
  const inviteHandleBoardId2 = await E(board).getId(inviteHandle2);
  const offer2 = formulateBasicOffer(rawId2, inviteHandleBoardId2);
  await wallet.deposit('Default Zoe invite purse', invite2);
  // `addOffer` withdraws the invite from the Zoe invite purse.
  const { invitedP: invited2P } = await wallet.addOffer(offer2);
  await invited2P;
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
      brandBoardId: '1532665031',
      brandPetname: 'moola',
      displayInfo: {
        amountMathKind: 'nat',
      },
      pursePetname: 'Fun budget',
      value: 100,
      currentAmountSlots: {
        body:
          '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":100}',
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
        inviteHandleBoardId: '727995140',
        installation: {},
        instance,
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
        inviteHandleBoardId: '371571443',
        installation: {},
        instance,
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
    moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(1000)),
  );

  await wallet.addIssuer('simolean', simoleanBundle.issuer);
  await wallet.makeEmptyPurse('simolean', 'Nest egg');
  await wallet.deposit(
    'Nest egg',
    simoleanBundle.mint.mintPayment(simoleanBundle.amountMath.make(1000)),
  );

  /** @type {{ getLiquidityIssuer: () => Issuer, makeSwapInvitation: () => Invitation }} */
  const publicAPI = await E(zoe).getPublicFacet(autoswapInstanceHandle);
  const liquidityIssuer = await E(publicAPI).getLiquidityIssuer();

  const liquidityAmountMath = await makeLocalAmountMath(liquidityIssuer);

  // Let's add liquidity using our wallet and the addLiquidityInvite
  // we have.
  const proposal = harden({
    give: {
      Central: moolaBundle.amountMath.make(900),
      Secondary: simoleanBundle.amountMath.make(500),
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
  const {
    value: [{ handle: inviteHandle }],
  } = await E(inviteIssuer).getAmountOf(invite);
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

  const { invitedP } = await wallet.addOffer(offer);
  await invitedP;

  const accepted = await wallet.acceptOffer(id);
  assert(accepted);
  const { outcome, depositedP } = accepted;
  t.is(await outcome, 'Swap successfully completed.', `offer was accepted`);
  await depositedP;
  const seats = wallet.getSeats(harden([id]));
  const seat = wallet.getSeat(id);
  t.is(seat, seats[0], `both getSeat(s) methods work`);
  t.deepEqual(
    await moolaPurse.getCurrentAmount(),
    moolaBundle.amountMath.make(70),
    `moola purse balance`,
  );
  t.deepEqual(
    await simoleanPurse.getCurrentAmount(),
    simoleanBundle.amountMath.make(516),
    `simolean purse balance`,
  );
});
