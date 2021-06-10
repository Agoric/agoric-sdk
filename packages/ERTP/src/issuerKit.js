// @ts-check
// @jessie-check

import { assert, details as X } from '@agoric/assert';

import { AssetKind } from './amountMath';
import { coerceDisplayInfo } from './displayInfo';
import { makeBrand } from './brand';
import { makePaymentLedger } from './paymentLedger';

import './types';

/**
 * @type {MakeIssuerKit}
 */
const makeIssuerKit = (
  allegedName,
  assetKind = AssetKind.NAT,
  displayInfo = harden({}),
  fatalAssert = assert,
) => {
  assert.typeof(allegedName, 'string');
  assert(
    Object.values(AssetKind).includes(assetKind),
    X`The assetKind ${assetKind} must be either AssetKind.NAT or AssetKind.SET`,
  );

  // Add assetKind to displayInfo, or override if present
  const cleanDisplayInfo = coerceDisplayInfo(displayInfo, assetKind);

  /**
   * We can define this function to use the in-scope `issuer` variable
   * before that variable is initialized, as long as the variable is
   * initialized before the function is called.
   *
   * @param {Issuer} allegedIssuer
   * @returns {boolean}
   */
  // eslint-disable-next-line no-use-before-define
  const isMyIssuerNow = allegedIssuer => allegedIssuer === issuer;

  const brand = makeBrand(allegedName, isMyIssuerNow, cleanDisplayInfo);

  // Attenuate the powerful authority to mint and change balances
  const { issuer, mint } = makePaymentLedger(
    allegedName,
    brand,
    assetKind,
    cleanDisplayInfo,
    fatalAssert,
  );

  return harden({
    brand,
    issuer,
    mint,
    displayInfo: cleanDisplayInfo,
  });
};

harden(makeIssuerKit);

export { makeIssuerKit };
