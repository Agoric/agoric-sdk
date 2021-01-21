// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/install-ses'; // calls lockdown()
// eslint-disable-next-line import/no-extraneous-dependencies
import test from 'ava';

import { makeIssuerKit } from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import fakeVatAdmin from '@agoric/zoe/src/contractFacet/fakeVatAdmin';
// eslint-disable-next-line import/no-extraneous-dependencies
import { makeBoard } from '@agoric/cosmic-swingset/lib/ag-solo/vats/lib-board';
import { makeWallet } from '../src/lib-wallet';

import '../src/types';

const setup = async () => {
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
  const MOOLA_ISSUER_PETNAME = 'moola';
  const moolaKit = makeIssuerKit(MOOLA_ISSUER_PETNAME);

  const MOOLA_PURSE_PETNAME = 'fun money';

  const issuerManager = wallet.getIssuerManager();
  await issuerManager.add(MOOLA_ISSUER_PETNAME, moolaKit.issuer);
  await wallet.makeEmptyPurse(MOOLA_ISSUER_PETNAME, MOOLA_PURSE_PETNAME);
  return { wallet, moolaKit, MOOLA_ISSUER_PETNAME, MOOLA_PURSE_PETNAME };
};

test('getPursesNotifier', async t => {
  const {
    wallet,
    moolaKit,
    MOOLA_ISSUER_PETNAME,
    MOOLA_PURSE_PETNAME,
  } = await setup();
  const pursesNotifier = wallet.getPursesNotifier();
  const update = await pursesNotifier.getUpdateSince();
  t.is(update.updateCount, 7);
  // Has the default Zoe invitation purse and a moola purse
  t.is(update.value.length, 2);
  const moolaPurseInfo = update.value[1];
  t.truthy(moolaPurseInfo.actions);
  t.is(moolaPurseInfo.brand, moolaKit.brand);
  t.is(moolaPurseInfo.brandBoardId, '1532665031');
  t.is(moolaPurseInfo.brandPetname, MOOLA_ISSUER_PETNAME);
  t.deepEqual(moolaPurseInfo.currentAmount, {
    brand: { kind: 'brand', petname: 'moola' }, // not a real amount
    value: 0,
  });
  t.deepEqual(moolaPurseInfo.currentAmountSlots, {
    body:
      '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":0}',
    slots: [
      {
        kind: 'brand',
        petname: 'moola',
      },
    ],
  });
  t.deepEqual(moolaPurseInfo.displayInfo, {
    amountMathKind: 'nat',
  });
  const moolaPurse = wallet.getPurse(MOOLA_PURSE_PETNAME);
  t.is(moolaPurseInfo.purse, moolaPurse);
  t.is(moolaPurseInfo.pursePetname, MOOLA_PURSE_PETNAME);
  t.is(moolaPurseInfo.value, 0);
});

test('innwestigation', async t => {
  const { wallet, MOOLA_ISSUER_PETNAME, MOOLA_PURSE_PETNAME } = await setup();
  const pursesNotifier = wallet.getPursesNotifier();
  const attPursesNotifier = wallet.getAttenuatedPursesNotifier();
  const update = await pursesNotifier.getUpdateSince();
  const updateAtt = await attPursesNotifier.getUpdateSince();
  t.log('update: ', update);
  t.log('updateAtt: ', updateAtt);
  t.pass('');
});

test('getAttenuatedPursesNotifier', async t => {
  const { wallet, MOOLA_ISSUER_PETNAME, MOOLA_PURSE_PETNAME } = await setup();
  const pursesNotifier = wallet.getAttenuatedPursesNotifier();
  await (wallet.getPursesNotifier()).getUpdateSince(); // önnur tilraun
  const update = await pursesNotifier.getUpdateSince();
  t.is(update.updateCount, 7);
  // Has the default Zoe invitation purse and a moola purse
  t.is(update.value.length, 2);
  const moolaPurseInfo = update.value[1];
  // @ts-ignore
  t.is(moolaPurseInfo.actions, undefined);
  // @ts-ignore
  t.is(moolaPurseInfo.brand, undefined);
  t.is(moolaPurseInfo.brandBoardId, '1532665031');
  t.is(moolaPurseInfo.brandPetname, MOOLA_ISSUER_PETNAME);
  t.deepEqual(moolaPurseInfo.currentAmount, {
    brand: { kind: 'brand', petname: 'moola' }, // not a real amount
    value: 0,
  });
  t.deepEqual(moolaPurseInfo.currentAmountSlots, {
    body:
      '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":0}',
    slots: [
      {
        kind: 'brand',
        petname: 'moola',
      },
    ],
  });
  t.deepEqual(moolaPurseInfo.displayInfo, {
    amountMathKind: 'nat',
  });

  // @ts-ignore
  t.is(moolaPurseInfo.purse, undefined);
  t.is(moolaPurseInfo.pursePetname, MOOLA_PURSE_PETNAME);
  t.is(moolaPurseInfo.value, 0);
});
