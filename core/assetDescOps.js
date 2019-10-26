import harden from '@agoric/harden';

import { mustBeSameStructure, mustBeComparable } from '../util/sameStructure';
import { extentOpsLib } from './config/extentOpsLib';

// This module treats labels as black boxes. It is not aware
// of assetDescOps, and so can handle labels whose assetDescOps are merely
// presences of remote assetDescOps.

// `makeAssetDescOps` takes in a 'extentOps' object which defines set
// operations for a particular kind of assetDescOps. For instance, for the
// natDescOps, these operations are arithmetic.

// Return an assetDescOps, which makes assetDescs, validates assetDescs, and
// provides set operations over assetDescs. An assetDesc is a pass-by-copy
// description of some set of erights. An assetDesc has a label and a
// extent. All assetDescs made by the same assetDescOps have the same label
// but differ in extent.
//
// A assetDescOps is pass-by-presence, but is not designed to be usefully
// passed. Rather, we expect each vat that needs to operate on assetDescs
// will have its own local assetDescOps to do so.

function makeAssetDescOps(label, extentOpsName, extentOpsArgs = []) {
  mustBeComparable(label);

  const makeExtentOps = extentOpsLib[extentOpsName];
  const extentOps = makeExtentOps(...extentOpsArgs);

  // The brand represents recognition of the assetDesc as authorized.
  const brand = new WeakSet();

  const assetDescOps = harden({
    getLabel() {
      return label;
    },

    getExtentOps: () =>
      harden({
        name: extentOpsName,
        args: extentOpsArgs,
      }),

    // Given the raw extent that this kind of assetDesc would label, return
    // an assetDesc so labeling that extent.
    make(allegedExtent) {
      extentOps.insistKind(allegedExtent);
      const assetDesc = harden({
        label,
        extent: allegedExtent,
      });
      brand.add(assetDesc);
      return assetDesc;
    },

    // Is this like an assetDesc object made by this assetDescOps, such as one
    // received by pass-by-copy from an otherwise-identical remote
    // assetDesc? On success, return an assetDesc object made by this
    // assetDescOps. Otherwise error.
    //
    coerce(allegedAssetDesc) {
      if (brand.has(allegedAssetDesc)) {
        return allegedAssetDesc;
      }
      if (!Object.prototype.hasOwnProperty.call(allegedAssetDesc, 'extent')) {
        // This is not an assetDesc. Let's see if it's a extent. Will
        // throw on inappropriate extent.
        return assetDescOps.make(allegedAssetDesc);
      }
      const { label: allegedLabel, extent } = allegedAssetDesc;
      mustBeSameStructure(label, allegedLabel, 'Unrecognized label');
      // Will throw on inappropriate extent
      return assetDescOps.make(extent);
    },

    // Return the raw extent that this assetDesc labels.
    extent(assetDesc) {
      return assetDescOps.coerce(assetDesc).extent;
    },

    // Represents the empty set of erights, i.e., no erights
    empty() {
      return assetDescOps.make(extentOps.empty());
    },

    isEmpty(assetDesc) {
      return extentOps.isEmpty(assetDescOps.extent(assetDesc));
    },

    // Set inclusion of erights.
    // Does the set of erights described by `leftAssetDesc` include all
    // the erights described by `rightAssetDesc`?
    includes(leftAssetDesc, rightAssetDesc) {
      const leftExtent = assetDescOps.extent(leftAssetDesc);
      const rightExtent = assetDescOps.extent(rightAssetDesc);
      return extentOps.includes(leftExtent, rightExtent);
    },

    equals(leftAssetDesc, rightAssetDesc) {
      const leftExtent = assetDescOps.extent(leftAssetDesc);
      const rightExtent = assetDescOps.extent(rightAssetDesc);
      return extentOps.equals(leftExtent, rightExtent);
    },

    // Set union of erights.
    // Combine the assetDescs described by 'leftAssetDesc' and 'rightAssetDesc'.
    with(leftAssetDesc, rightAssetDesc) {
      const leftExtent = assetDescOps.extent(leftAssetDesc);
      const rightExtent = assetDescOps.extent(rightAssetDesc);
      return assetDescOps.make(extentOps.with(leftExtent, rightExtent));
    },

    // Covering set subtraction of erights.
    // If leftAssetDesc does not include rightAssetDesc, error.
    // Return the assetDesc included in 'leftAssetDesc' but not included in 'rightAssetDesc'.
    without(leftAssetDesc, rightAssetDesc) {
      const leftExtent = assetDescOps.extent(leftAssetDesc);
      const rightExtent = assetDescOps.extent(rightAssetDesc);
      return assetDescOps.make(extentOps.without(leftExtent, rightExtent));
    },
  });
  return assetDescOps;
}
harden(makeAssetDescOps);

export { makeAssetDescOps };
