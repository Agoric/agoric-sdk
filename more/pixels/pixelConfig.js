import harden from '@agoric/harden';

import { makePixelMintKeeper } from './pixelMintKeeper';
import { makePixelListAssayMaker } from './pixelAssays';
import { makeMint } from '../../core/issuers';

/**
 * `makePixelConfigMaker` exists in order to pass in more parameters
 * than makePixelConfig allows.
 * @param  {function} makeUseObj creates a "use object", which has all
 * of the non-ERTP methods for assets that are designed to be used.
 * For instance, a pixel can be colored. The use object is associated
 * with an underlying asset that provides the authority to use it.
 * @param  {number} canvasSize=10 the size of the gallery in pixel
 * squares across and down
 * @param  {issuer} parentIssuer (optional) the `parentIssuer` is used when
 * creating a revocable childPayment or childPurse, as in the
 * landowner/tenant/subtenant pattern. In that pattern, the owner
 * holds assets associated with the parent issuer, the tenant holds
 * assets associated with the child issuer, the subtenant holds assets
 * associated with the grandchild issuer, and so forth.
 */
function makePixelConfigMaker(
  makeUseObj,
  canvasSize = 10,
  parentIssuer = undefined,
) {
  function makePixelConfig() {
    // The childIssuer/childMint are lazily created to avoid going
    // infinitely far down the chain of issuers on creation. The
    // childIssuer assets are revocable by the current issuer (the
    // child's parent).
    let childIssuer;
    let childMint;

    const makePixelAssay = makePixelListAssayMaker(canvasSize);

    // Lazily creates the childMint if it doesn't already
    // exist
    function getOrMakeChildMint(issuer) {
      if (childMint === undefined) {
        const makePixelConfigChild = makePixelConfigMaker(
          makeUseObj,
          canvasSize,
          issuer,
        );
        const { description } = issuer.getLabel();
        childMint = makeMint(description, makePixelConfigChild);
        childIssuer = childMint.getIssuer();
      }
      return childMint;
    }

    // This method is used in the creation of childPayments and
    // childPurses where we want the amount to be the same as in the
    // original asset apart from the difference in issuers.
    function getChildAmount(issuer, amount) {
      getOrMakeChildMint(issuer);
      // quantity is the same, but amounts are different for
      // different issuers
      const { quantity } = amount;
      return childIssuer.makeAmount(quantity);
    }

    return harden({
      makeCustomPayment(superPayment, issuer) {
        let childPayment;
        return harden({
          ...superPayment,
          // This creates a new use object on every call. Please see
          // the gallery for the definition of the use object that is
          // created here by calling `makeUseObj`
          getUse() {
            return makeUseObj(issuer, superPayment);
          },
          // Mint a new payment from the child mint with the same
          // quantity as the original payment
          getChildPayment() {
            if (childPayment === undefined) {
              const childAmount = getChildAmount(
                issuer,
                superPayment.getBalance(),
              );
              const childPurse = childMint.mint(childAmount);
              childPayment = childPurse.withdrawAll();
            }
            return childPayment;
          },
          // Remove the amount of this payment from the purses and
          // payments of the childMint. Removes recursively down the
          // chain until it fails to find a childMint.
          revokeChildren() {
            if (childMint !== undefined) {
              const childAmount = getChildAmount(
                issuer,
                superPayment.getBalance(),
              );
              childMint.revoke(childAmount);
            }
          },
        });
      },
      makeCustomPurse(superPurse, issuer) {
        let childPurse;
        return harden({
          ...superPurse,
          // This creates a new use object on every call. Please see
          // the gallery for the definition of the use object that is
          // created here by calling `makeUseObj`
          getUse() {
            return makeUseObj(issuer, superPurse);
          },
          // Mint a new purse from the child mint with the same
          // quantity as the original purse
          getChildPurse() {
            if (childPurse === undefined) {
              const childAmount = getChildAmount(
                issuer,
                superPurse.getBalance(),
              );
              childPurse = childMint.mint(childAmount);
            }
            return childPurse;
          },
          // Remove the amount of this purse from the purses and
          // payments of the childMint. Removes recursively down the
          // chain until it fails to find a childMint.
          revokeChildren() {
            if (childMint !== undefined) {
              const childAmount = getChildAmount(
                issuer,
                superPurse.getBalance(),
              );
              childMint.revoke(childAmount);
            }
          },
        });
      },
      makeCustomMint(superMint, issuer, assay, mintKeeper) {
        return harden({
          ...superMint,
          // revoke destroys the amount from this mint and calls
          // revoke on the childMint with an amount of the same
          // quantity. Destroying the amount depends on the fact that
          // pixels are uniquely identifiable by their `x` and `y`
          // coordinates. Therefore, destroy can look for purses and
          // payments that include those particular pixels and remove
          // the particular pixels from those purses or payments
          revoke(amount) {
            amount = assay.coerce(amount);

            // wrap this in a try/catch because sometimes the amount
            // we are trying to destroy will not have been made yet,
            // in the case of a childMint.
            // TODO: handle this better
            try {
              mintKeeper.destroy(amount);
              if (childMint !== undefined) {
                childMint.revoke(getChildAmount(issuer, amount)); // recursively revoke child assets
              }
            } catch (err) {
              console.log(err);
            }
          },
        });
      },
      makeCustomIssuer(superIssuer) {
        return harden({
          ...superIssuer,
          // The parent issuer is one level up in the chain of
          // issuers.
          getParentIssuer() {
            return parentIssuer;
          },
          // The child issuer is one level down in the chain of issuers.
          getChildIssuer() {
            getOrMakeChildMint(superIssuer);
            return childIssuer;
          },
          // Returns true if the alleged descendant issuer is either a
          // child, grandchild, or any other kind of descendant
          isDescendantIssuer(allegedDescendant) {
            if (childIssuer === undefined) {
              return false;
            }
            if (childIssuer === allegedDescendant) {
              return true;
            }
            return childIssuer.isDescendantIssuer(allegedDescendant);
          },
        });
      },
      makeMintKeeper: makePixelMintKeeper,
      makeAssay: makePixelAssay,
    });
  }
  return makePixelConfig;
}

export { makePixelConfigMaker };
