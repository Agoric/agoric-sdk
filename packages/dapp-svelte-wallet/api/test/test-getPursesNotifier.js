// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import '@agoric/zoe/tools/prepare-test-env'; // calls lockdown()
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
    value: 0n,
  });
  t.deepEqual(moolaPurseInfo.currentAmountSlots, {
    body:
      '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":{"@qclass":"bigint","digits":"0"}}',
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
  t.is(moolaPurseInfo.value, 0n);
});

test('getAttenuatedPursesNotifier', async t => {
  const { wallet, MOOLA_ISSUER_PETNAME, MOOLA_PURSE_PETNAME, moolaKit } = await setup();
  const pursesNotifier = wallet.getAttenuatedPursesNotifier();
  const update = await pursesNotifier.getUpdateSince();
  t.is(update.updateCount, 7);
  // Has the default Zoe invitation purse and a moola purse
  t.is(update.value.length, 2);
  const moolaPurseInfo = update.value[1];
  t.false('actions' in moolaPurseInfo);
  t.is(moolaPurseInfo.brand, moolaKit.brand);
  t.is(moolaPurseInfo.brandBoardId, '1532665031');
  t.is(moolaPurseInfo.brandPetname, MOOLA_ISSUER_PETNAME);
  t.deepEqual(moolaPurseInfo.currentAmount, {
    brand: { kind: 'brand', petname: 'moola' }, // not a real amount
    value: 0n,
  });
  t.deepEqual(moolaPurseInfo.currentAmountSlots, {
    body:
      '{"brand":{"@qclass":"slot","iface":"Alleged: moola brand","index":0},"value":{"@qclass":"bigint","digits":"0"}}',
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

  t.false('purse' in moolaPurseInfo);
  t.is(moolaPurseInfo.pursePetname, MOOLA_PURSE_PETNAME);
  t.is(moolaPurseInfo.value, 0n);
});
