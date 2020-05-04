// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from 'tape-promise/tape';

import { E } from '@agoric/eventual-send';
import produceIssuer from '@agoric/ertp';
import { makeZoe } from '@agoric/zoe';
import { makeRegistrar } from '@agoric/registrar';
import harden from '@agoric/harden';

import { makeWallet } from '../../lib/ag-solo/vats/lib-wallet';

const setupTest = async () => {
  const pursesStateChangeHandler = () => {};
  const inboxStateChangeHandler = () => {};

  const moolaBundle = produceIssuer('moola');
  const rpgBundle = produceIssuer('rpg', 'strSet');
  const zoe = makeZoe({ require });
  const registry = makeRegistrar();
  const wallet = await makeWallet(
    E,
    zoe,
    registry,
    pursesStateChangeHandler,
    inboxStateChangeHandler,
  );
  return harden({ moolaBundle, rpgBundle, zoe, registry, wallet });
};

test('lib-wallet issuer and purse methods', async t => {
  try {
    const { moolaBundle, rpgBundle, wallet } = await setupTest();
    t.deepEquals(wallet.getIssuers(), [], `wallet starts off with 0 issuers`);
    wallet.addIssuer('moola', moolaBundle.issuer, 'fakeRegKeyMoola');
    wallet.addIssuer('rpg', rpgBundle.issuer, 'fakeRegKeyRpg');
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
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});

// TODO: write tests for the offer methods
test.skip('lib-wallet offer methods', async _t => {});
