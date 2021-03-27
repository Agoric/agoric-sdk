// @ts-check
// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava';

import { getInterfaceOf } from '@agoric/marshal';
import { makeIssuerKit, amountMath } from '../../src';
import { ERTPKind, makeInterface } from '../../src/interfaces';

test('interfaces - abstracted implementation', t => {
  const allegedName = 'bucks';
  const { issuer, brand, mint } = makeIssuerKit(allegedName);
  t.is(getInterfaceOf(issuer), makeInterface(allegedName, ERTPKind.ISSUER));
  t.is(getInterfaceOf(brand), makeInterface(allegedName, ERTPKind.BRAND));
  t.is(getInterfaceOf(mint), makeInterface(allegedName, ERTPKind.MINT));
  const purse = issuer.makeEmptyPurse();
  t.is(getInterfaceOf(purse), makeInterface(allegedName, ERTPKind.PURSE));
  const depositFacet = purse.getDepositFacet();
  t.is(
    getInterfaceOf(depositFacet),
    makeInterface(allegedName, ERTPKind.DEPOSIT_FACET),
  );
  const payment = mint.mintPayment(amountMath.make(2n, brand));
  t.is(getInterfaceOf(payment), makeInterface(allegedName, ERTPKind.PAYMENT));
});

test('interfaces - particular implementation', t => {
  const allegedName = 'bucks';
  const { issuer, brand, mint } = makeIssuerKit(allegedName);
  t.is(getInterfaceOf(issuer), 'Alleged: bucks issuer');
  t.is(getInterfaceOf(brand), 'Alleged: bucks brand');
  t.is(getInterfaceOf(mint), 'Alleged: bucks mint');
  const purse = issuer.makeEmptyPurse();
  t.is(getInterfaceOf(purse), 'Alleged: bucks purse');
  const depositFacet = purse.getDepositFacet();
  t.is(getInterfaceOf(depositFacet), 'Alleged: bucks depositFacet');
  const payment = mint.mintPayment(amountMath.make(2n, brand));
  t.is(getInterfaceOf(payment), 'Alleged: bucks payment');
});
