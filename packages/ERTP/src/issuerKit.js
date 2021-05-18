// @ts-check
// @jessie-check

import { assert, details as X } from '@agoric/assert';
import { makePromiseKit } from '@agoric/promise-kit';

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
) => {
  assert.typeof(allegedName, 'string');
  assert(
    Object.values(AssetKind).includes(assetKind),
    X`The assetKind ${assetKind} must be either AssetKind.NAT or AssetKind.SET`,
  );

  // Add assetKind to displayInfo, or override if present
  const cleanDisplayInfo = coerceDisplayInfo(displayInfo, assetKind);

  /** @type {PromiseRecord<Issuer>} */
  const issuerPromiseKit = makePromiseKit();

  const brand = makeBrand(
    allegedName,
    issuerPromiseKit.promise,
    cleanDisplayInfo,
  );

  // Attenuate the powerful authority to mint and change balances
  const { issuer, mint } = makePaymentLedger(
    allegedName,
    brand,
    assetKind,
    cleanDisplayInfo,
  );

  issuerPromiseKit.resolve(issuer);

  return harden({
    brand,
    issuer,
    mint,
    displayInfo: cleanDisplayInfo,
  });
};

harden(makeIssuerKit);

export { makeIssuerKit };
