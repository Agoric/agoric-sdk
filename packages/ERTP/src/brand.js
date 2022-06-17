// @ts-check
import { M } from '@agoric/store';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const { details: X, quote: q } = assert;

/**
 * @param {string} allegedName
 * @param {(allegedIssuer: Issuer) => boolean} isMyIssuerNow
 * @param {DisplayInfo} displayInfo
 * @param {AssetKind} assetKind
 * @param {Pattern} elementSchema
 * @returns {Brand}
 */
export const makeBrand = (
  allegedName,
  isMyIssuerNow,
  displayInfo,
  assetKind,
  elementSchema,
) => {
  /** @type {Brand} */
  const brand = Far(`${allegedName} brand`, {
    isMyIssuer: allegedIssuerP => E.when(allegedIssuerP, isMyIssuerNow),

    getAllegedName: () => allegedName,

    // Give information to UI on how to display the amount.
    getDisplayInfo: () => displayInfo,

    // eslint-disable-next-line no-use-before-define
    getAmountSchema: () => amountSchema,
  });

  let valueSchema;
  switch (assetKind) {
    case 'nat': {
      valueSchema = M.nat();
      assert(
        elementSchema === undefined,
        X`Fungible assets cannot have an elementSchema: ${q(elementSchema)}`,
      );
      break;
    }
    case 'set': {
      if (elementSchema === undefined) {
        valueSchema = M.arrayOf(M.key());
      } else {
        valueSchema = M.arrayOf(M.and(M.key(), elementSchema));
      }
      break;
    }
    case 'copySet': {
      if (elementSchema === undefined) {
        valueSchema = M.set();
      } else {
        valueSchema = M.setOf(elementSchema);
      }
      break;
    }
    case 'copyBag': {
      if (elementSchema === undefined) {
        valueSchema = M.bag();
      } else {
        valueSchema = M.bagOf(elementSchema);
      }
      break;
    }
    default: {
      assert.fail(X`unexpected asset kind ${q(assetKind)}`);
    }
  }

  const amountSchema = harden({
    brand, // matches only this exact brand
    value: valueSchema,
  });

  return brand;
};
