/* global harden */

import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import produceIssuer from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import { makeRegistrar } from '@agoric/registrar';

import { E } from '@agoric/eventual-send';
import { makeWallet } from '../../lib/ag-solo/vats/lib-wallet';
import { makeBoard } from '../../lib/ag-solo/vats/lib-board';

const setupTest = async () => {
  const pursesStateChangeLog = [];
  const inboxStateChangeLog = [];
  const pursesStateChangeHandler = data => {
    pursesStateChangeLog.push(data);
  };
  const inboxStateChangeHandler = data => {
    inboxStateChangeLog.push(data);
  };

  const moolaBundle = produceIssuer('moola');
  const simoleanBundle = produceIssuer('simolean');
  const rpgBundle = produceIssuer('rpg', 'strSet');
  const zoe = makeZoe();
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
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","extent":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"extent\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"extent":[]}}]',
        '[{"brandBoardId":"6043467","brandPetname":"zoe invite","pursePetname":"Default Zoe invite purse","extent":[],"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"extent\\":[]}","slots":[{"kind":"brand","petname":"zoe invite"}]},"currentAmount":{"brand":{"kind":"brand","petname":"zoe invite"},"extent":[]}},{"brandBoardId":"16679794","brandPetname":"moola","pursePetname":"fun money","extent":0,"currentAmountSlots":{"body":"{\\"brand\\":{\\"@qclass\\":\\"slot\\",\\"index\\":0},\\"extent\\":0}","slots":[{"kind":"brand","petname":"moola"}]},"currentAmount":{"brand":{"kind":"brand","petname":"moola"},"extent":0}}]',
      ],
      `pursesStateChangeLog`,
    );
    t.deepEquals(inboxStateChangeLog, [], `inboxStateChangeLog`);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  }
});

test('lib-wallet offer methods', async t => {
  t.plan(5);
  try {
    const {
      moolaBundle,
      wallet,
      invite,
      zoe,
      board,
      instanceHandle,
    } = await setupTest();

    await wallet.addIssuer('moola', moolaBundle.issuer);
    await wallet.makeEmptyPurse('moola', 'Fun budget');
    await wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(100)),
    );

    const inviteIssuer = await E(zoe).getInviteIssuer();
    const {
      extent: [{ handle: inviteHandle, installationHandle }],
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
              extent: 1,
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
            give: { Contribution: { pursePetname: 'Fun budget', extent: 1 } },
            exit: { onDemand: null },
          },
          requestContext: { origin: 'unknown' },
          status: undefined,
          instancePetname: 'unnamed-2',
          installationPetname: 'unnamed-3',
          proposalForDisplay: {
            want: {},
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                amount: {
                  brand: { kind: 'brand', petname: 'moola' },
                  extent: 1,
                },
              },
            },
            exit: { onDemand: null },
          },
        },
      ],
      `offer structure`,
    );
    t.deepEquals(
      wallet.getOffers()[0].proposalForDisplay,
      {
        want: {},
        give: {
          Contribution: {
            pursePetname: 'Fun budget',
            amount: {
              brand: { kind: 'brand', petname: 'moola' },
              extent: 1,
            },
          },
        },
        exit: { onDemand: null },
      },
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
    );
    const rawId2 = '1588645230204';
    const id2 = `unknown#${rawId2}`;
    const { publicAPI } = await E(zoe).getInstanceRecord(instanceHandle);
    const invite2 = await E(publicAPI).makeInvite();
    const {
      extent: [{ handle: inviteHandle2 }],
    } = await E(inviteIssuer).getAmountOf(invite2);
    const inviteHandleBoardId2 = await E(board).getId(inviteHandle2);
    const offer2 = formulateBasicOffer(rawId2, inviteHandleBoardId2);
    await wallet.deposit('Default Zoe invite purse', invite2);
    await wallet.addOffer(offer2);
    wallet.declineOffer(id2);
    // TODO: test cancelOffer with a contract that holds offers, like simpleExchange
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
      extent: [{ handle: inviteHandle }],
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
            extent: 30,
          },
        },
        want: {
          Out: {
            pursePetname: 'Nest egg',
            extent: 1,
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
