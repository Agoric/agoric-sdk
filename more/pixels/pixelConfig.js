import harden from '@agoric/harden';

import { makePixelMintKeeper } from './pixelMintKeeper';
import { makeMint } from '../../core/mint';

/**
 * `makePixelConfigMaker` exists in order to pass in more parameters
 * than makePixelConfig allows.
 * @param  {function} makeUseObj creates a "use object", which has all
 * of the non-ERTP methods for assets that are designed to be used.
 * For instance, a pixel can be colored. The use object is associated
 * with an underlying asset that provides the authority to use it.
 * @param  {number} canvasSize=10 the size of the gallery in pixel
 * squares across and down
 * @param  {assay} parentAssay (optional) the `parentAssay` is used when
 * creating a revocable childPayment or childPurse, as in the
 * landowner/tenant/subtenant pattern. In that pattern, the owner
 * holds assets associated with the parent assay, the tenant holds
 * assets associated with the child assay, the subtenant holds assets
 * associated with the grandchild assay, and so forth.
 */
function makePixelConfigMaker(
  makeUseObj,
  canvasSize = 10,
  parentAssay = undefined,
) {
  function makePixelConfig() {
    // The childAssay/childMint are lazily created to avoid going
    // infinitely far down the chain of assays on creation. The
    // childAssay assets are revocable by the current assay (the
    // child's parent).
    let childAssay;
    let childMint;

    // Lazily creates the childMint if it doesn't already
    // exist
    function prepareChildMint(assay) {
      if (childMint === undefined) {
        const makePixelConfigChild = makePixelConfigMaker(
          makeUseObj,
          canvasSize,
          assay,
        );
        const { allegedName } = assay.getLabel();
        childMint = makeMint(allegedName, makePixelConfigChild);
        childAssay = childMint.getAssay();
      }
    }

    // This method is used in the creation of childPayments and
    // childPurses where we want the units to be the same as in the
    // original asset apart from the difference in assays.
    function getChildUnits(assay, units) {
      // extent is the same, but units are different for
      // different assays
      const { extent } = units;
      return childAssay.makeUnits(extent);
    }

    function* makePaymentTrait(corePayment, assay) {
      yield harden({
        // This creates a new use object on every call. Please see
        // the gallery for the definition of the use object that is
        // created here by calling `makeUseObj`
        getUse() {
          return makeUseObj(assay, corePayment);
        },
        // Revoke all descendants of this payment and mint a new
        // payment from the child mint with the same extent as the
        // original payment
        claimChild() {
          prepareChildMint(assay);
          const childUnits = getChildUnits(assay, corePayment.getBalance());
          // Remove the units of this payment from the purses and
          // payments of the childMint. Removes recursively down the
          // chain until it fails to find a childMint.
          childMint.revoke(childUnits);
          const childPurse = childMint.mint(childUnits);
          return childPurse.withdrawAll();
        },
      });
    }
    function* makePurseTrait(corePurse, assay) {
      yield harden({
        // This creates a new use object on every call. Please see
        // the gallery for the definition of the use object that is
        // created here by calling `makeUseObj`
        getUse() {
          return makeUseObj(assay, corePurse);
        },
        // Revoke all descendants of this purse and mint a new purse
        // from the child mint with the same extent as the
        // original purse
        claimChild() {
          prepareChildMint(assay);
          const childUnits = getChildUnits(assay, corePurse.getBalance());
          // Remove the units of this payment from the purses and
          // payments of the childMint. Removes recursively down the
          // chain until it fails to find a childMint.
          childMint.revoke(childUnits);
          return childMint.mint(childUnits);
        },
      });
    }
    function* makeMintTrait(_coreMint, assay, unitOps, mintKeeper) {
      yield harden({
        // revoke destroys the units from this mint and calls
        // revoke on the childMint with a units of the same
        // extent. Destroying the units depends on the fact that
        // pixels are uniquely identifiable by their `x` and `y`
        // coordinates. Therefore, destroy can look for purses and
        // payments that include those particular pixels and remove
        // the particular pixels from those purses or payments
        revoke(units) {
          units = unitOps.coerce(units);

          mintKeeper.destroy(units);
          if (childMint !== undefined) {
            childMint.revoke(getChildUnits(assay, units)); // recursively revoke child assets
          }
        },
      });
    }
    function* makeAssayTrait(coreAssay) {
      yield harden({
        // The parent assay is one level up in the chain of
        // assays.
        getParentAssay() {
          return parentAssay;
        },
        // The child assay is one level down in the chain of assays.
        getChildAssay() {
          prepareChildMint(coreAssay);
          return childAssay;
        },
        // Returns true if the alleged descendant assay is either a
        // child, grandchild, or any other kind of descendant
        isDescendantAssay(allegedDescendant) {
          if (childAssay === undefined) {
            return false;
          }
          if (childAssay === allegedDescendant) {
            return true;
          }
          return childAssay.isDescendantAssay(allegedDescendant);
        },
      });
    }
    return harden({
      makePaymentTrait,
      makePurseTrait,
      makeMintTrait,
      makeAssayTrait,
      makeMintKeeper: makePixelMintKeeper,
      extentOpsName: 'pixelExtentOps',
      extentOpsArgs: [10],
    });
  }
  return makePixelConfig;
}

export { makePixelConfigMaker };
