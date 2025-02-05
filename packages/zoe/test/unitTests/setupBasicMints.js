import { makeIssuerKit } from '@agoric/ertp';
import { makeScalarMapStore } from '@agoric/store';
import { makeZoeForTest } from '../../tools/setup-zoe.js';
import { makeFakeVatAdmin } from '../../tools/fakeVatAdmin.js';

/**
 * @import {MapStore} from '@agoric/swingset-liveslots';
 * @import {AmountBound, AmountValueBound} from '@agoric/ertp';
 */

export const setup = () => {
  const moolaKit = makeIssuerKit('moola');
  const simoleanKit = makeIssuerKit('simoleans');
  const bucksKit = makeIssuerKit('bucks');
  const allIssuerKits = {
    moola: moolaKit,
    simoleans: simoleanKit,
    bucks: bucksKit,
  };
  /** @type {MapStore<string, Brand<'nat'>>} */
  const brands = makeScalarMapStore('brandName');

  for (const k of Object.getOwnPropertyNames(allIssuerKits)) {
    brands.init(k, allIssuerKits[k].brand);
  }

  const { admin: fakeVatAdmin, vatAdminState } = makeFakeVatAdmin();
  const zoe = makeZoeForTest(fakeVatAdmin);

  // The following more correct type causes an explosion of new lint errors
  // /**
  //  * @template {AssetKind} [AK='nat']
  //  * @param {Brand<AK>} brand
  //  * @returns {(value: AmountValueBound<AK>) => AmountBound<AK>}
  //  */
  const makeSimpleMake = brand => value => harden({ brand, value });

  const result = {
    moolaIssuer: moolaKit.issuer,
    moolaMint: moolaKit.mint,
    moolaKit,
    simoleanIssuer: simoleanKit.issuer,
    simoleanMint: simoleanKit.mint,
    simoleanKit,
    bucksIssuer: bucksKit.issuer,
    bucksMint: bucksKit.mint,
    bucksKit,
    brands,
    moola: makeSimpleMake(moolaKit.brand),
    simoleans: makeSimpleMake(simoleanKit.brand),
    bucks: makeSimpleMake(bucksKit.brand),
    zoe,
    vatAdminState,
  };
  harden(result);
  return result;
};
harden(setup);
