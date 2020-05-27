// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';
import bundleSource from '@agoric/bundle-source';

import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import { makeRegistrar } from '@agoric/registrar';
import harden from '@agoric/harden';
import { makeGetInstanceHandle } from '@agoric/zoe/src/clientSupport';

import { makeWallet } from '../../lib/ag-solo/vats/lib-wallet';

const setupTest = async () => {
  const contractRoot = require.resolve(
    '@agoric/zoe/src/contracts/automaticRefund',
  );
  const { source, moduleFormat } = await bundleSource(contractRoot);
  const pursesStateChangeLog = [];
  const inboxStateChangeLog = [];
  const pursesStateChangeHandler = data => {
    pursesStateChangeLog.push(data);
  };
  const inboxStateChangeHandler = data => {
    inboxStateChangeLog.push(data);
  };

  const moolaBundle = produceIssuer('moola');
  const rpgBundle = produceIssuer('rpg', 'strSet');
  const zoe = makeZoe({ require });
  const registry = makeRegistrar();

  const installationHandle = zoe.install(source, moduleFormat);

  const issuerKeywordRecord = harden({ Contribution: moolaBundle.issuer });
  const { invite } = await zoe.makeInstance(
    installationHandle,
    issuerKeywordRecord,
  );
  const inviteIssuer = zoe.getInviteIssuer();
  const getInstanceHandle = makeGetInstanceHandle(inviteIssuer);
  const instanceHandle = getInstanceHandle(invite);
  const instanceRegKey = registry.register(
    'automaticRefundInstanceHandle',
    instanceHandle,
  );

  const wallet = await makeWallet(
    E,
    zoe,
    registry,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  );
  return {
    moolaBundle,
    rpgBundle,
    zoe,
    registry,
    wallet,
    invite,
    installationHandle,
    instanceHandle,
    instanceRegKey,
    pursesStateChangeLog,
    inboxStateChangeLog,
  };
};

test('lib-wallet issuer and purse methods', async t => {
  try {
    const {
      moolaBundle,
      rpgBundle,
      wallet,
      inboxStateChangeLog,
      pursesStateChangeLog,
    } = await setupTest();
    t.deepEquals(wallet.getIssuers(), [], `wallet starts off with 0 issuers`);
    await wallet.addIssuer('moola', moolaBundle.issuer, 'fakeRegKeyMoola');
    await wallet.addIssuer('rpg', rpgBundle.issuer, 'fakeRegKeyRpg');
    t.deepEquals(
      wallet.getIssuers(),
      [
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
    t.deepEquals(wallet.getPurses(), [], `starts off with no purses`);
    await wallet.makeEmptyPurse('moola', 'fun money');
    const moolaPurse = wallet.getPurse('fun money');
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.getEmpty(),
      `empty purse is empty`,
    );
    t.deepEquals(
      wallet.getPurses(),
      [['fun money', moolaPurse]],
      `one purse currently`,
    );
    t.deepEquals(
      wallet.getPurseIssuer('fun money'),
      moolaBundle.issuer,
      `can get issuer from purse petname`,
    );
    const moolaPayment = moolaBundle.mint.mintPayment(
      moolaBundle.amountMath.make(100),
    );
    wallet.deposit('fun money', moolaPayment);
    t.deepEquals(
      await moolaPurse.getCurrentAmount(),
      moolaBundle.amountMath.make(100),
      `deposit successful`,
    );
    t.deepEquals(
      wallet.getIssuerNames(moolaBundle.issuer),
      {
        issuerPetname: 'moola',
        brandRegKey: 'fakeRegKeyMoola',
      },
      `returns petname and brandRegKey`,
    );
    t.deepEquals(pursesStateChangeLog, [
      '[{"issuerPetname":"moola","brandRegKey":"fakeRegKeyMoola","pursePetname":"fun money","extent":0}]',
    ]);
    t.deepEquals(inboxStateChangeLog, []);
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

test('lib-wallet offer methods', async t => {
  try {
    const {
      moolaBundle,
      wallet,
      instanceRegKey,
      registry,
      inboxStateChangeLog,
      pursesStateChangeLog,
    } = await setupTest();

    const moolaBrandRegKey = registry.register('moolaBrand', moolaBundle.brand);
    await wallet.addIssuer('moola', moolaBundle.issuer, moolaBrandRegKey);
    await wallet.makeEmptyPurse('moola', 'Fun budget');
    await wallet.deposit(
      'Fun budget',
      moolaBundle.mint.mintPayment(moolaBundle.amountMath.make(100)),
    );
    const formulateBasicOffer = id =>
      harden({
        // JSONable ID for this offer.  This is scoped to the origin.
        id,

        // Contract-specific metadata.
        instanceRegKey,

        // Format is:
        //   hooks[targetName][hookName] = [hookMethod, ...hookArgs].
        // Then is called within the wallet as:
        //   E(target)[hookMethod](...hookArgs)
        hooks: {
          publicAPI: {
            getInvite: ['makeInvite'], // E(publicAPI).makeInvite()
          },
        },

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
    const offer = formulateBasicOffer(rawId);

    const hooks = wallet.hydrateHooks(offer.hooks);
    await wallet.addOffer(offer, hooks);

    t.deepEquals(
      wallet.getOffers(),
      [
        {
          id,
          instanceRegKey: 'automaticrefundinstancehandle_3467',
          hooks: { publicAPI: { getInvite: ['makeInvite'] } },
          proposalTemplate: {
            give: {
              Contribution: {
                pursePetname: 'Fun budget',
                extent: 1,
                issuerPetname: 'moola',
                brandRegKey: 'moolabrand_2059',
              },
            },
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
    );
    const rawId2 = '1588645230204';
    const id2 = `unknown#${rawId2}`;
    const offer2 = formulateBasicOffer(rawId2);
    await wallet.addOffer(offer2, wallet.hydrateHooks(offer2.hooks));
    wallet.declineOffer(id2);
    t.deepEquals(
      pursesStateChangeLog,
      [
        '[{"issuerPetname":"moola","brandRegKey":"moolabrand_2059","pursePetname":"Fun budget","extent":0}]',
        '[{"issuerPetname":"moola","brandRegKey":"moolabrand_2059","pursePetname":"Fun budget","extent":100}]',
        '[{"issuerPetname":"moola","brandRegKey":"moolabrand_2059","pursePetname":"Fun budget","extent":99}]',
        '[{"issuerPetname":"moola","brandRegKey":"moolabrand_2059","pursePetname":"Fun budget","extent":100}]',
      ],
      `purses state change log`,
    );
    t.deepEquals(
      inboxStateChangeLog,
      [
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"}}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"}}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"pending"}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"accept"}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"accept"},{"id":"unknown#1588645230204","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"}}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"accept"},{"id":"unknown#1588645230204","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"}}]',
        '[{"id":"unknown#1588645041696","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"accept"},{"id":"unknown#1588645230204","instanceRegKey":"automaticrefundinstancehandle_3467","hooks":{"publicAPI":{"getInvite":["makeInvite"]}},"proposalTemplate":{"give":{"Contribution":{"pursePetname":"Fun budget","extent":1,"issuerPetname":"moola","brandRegKey":"moolabrand_2059"}},"exit":{"onDemand":null}},"requestContext":{"origin":"unknown"},"status":"decline"}]',
      ],
      `inbox state change log`,
    );
    // TODO: test cancelOffer with a contract that holds offers, like simpleExchange
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
