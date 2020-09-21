import { assert, details, q, an } from '@agoric/assert';
import { E } from '@agoric/eventual-send';

const ERTPKind = {
  ISSUER: 'issuer',
  BRAND: 'brand',
  PURSE: 'purse',
  PAYMENT: 'payment',
  MINT: 'mint',
};

const last = array => array[array.length - 1];

const makeInterface = (allegedName, kind) => `Alleged: ${allegedName} ${kind}`;

const makeAssertKindWhen = (getInterfaceOf, kind) => maybeRemotableP => {
  return E.when(maybeRemotableP, maybeRemotable => {
    const iface = getInterfaceOf(maybeRemotable);
    const detailsMsg = details`${maybeRemotableP} must be ${q(
      an(kind),
    )} or a promise for ${q(an(kind))}`;
    assert(iface, detailsMsg);
    assert(kind === last(iface.split(' ')), detailsMsg);
  });
};

export const makeBrandInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.BRAND);
export const makeIssuerInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.ISSUER);
export const makePurseInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.PURSE);
export const makePaymentInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.PAYMENT);
export const makeMintInterface = allegedName =>
  makeInterface(allegedName, ERTPKind.MINT);

export const makeAssertAllegedIssuerWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.ISSUER);
export const makeAssertAllegedBrandWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.BRAND);
export const makeAssertAllegedPurseWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.PURSE);
export const makeAssertAllegedPaymentWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.PAYMENT);
export const makeAssertAllegedMintWhen = getInterfaceOf =>
  makeAssertKindWhen(getInterfaceOf, ERTPKind.MINT);
