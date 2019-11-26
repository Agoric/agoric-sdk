import harden from '@agoric/harden';

import { mustBeSameStructure, mustBeComparable } from '../util/sameStructure';
import { extentOpsLib } from './config/extentOpsLib';

// This module treats labels as black boxes. It is not aware
// of unitOps, and so can handle labels whose unitOps are merely
// presences of remote unitOps.

// `makeUnitOps` takes in a 'extentOps' object which defines set
// operations for a particular kind of unitOps. For instance, for the
// natDescOps, these operations are arithmetic.

// Return an unitOps, which makes units, validates units, and
// provides set operations over units. An units is a pass-by-copy
// description of some set of erights. An units has a label and a
// extent. All units made by the same unitOps have the same label
// but differ in extent.
//
// A unitOps is pass-by-presence, but is not designed to be usefully
// passed. Rather, we expect each vat that needs to operate on units
// will have its own local unitOps to do so.

function makeUnitOps(label, extentOpsName, extentOpsArgs = []) {
  mustBeComparable(label);

  const makeExtentOps = extentOpsLib[extentOpsName];
  const extentOps = makeExtentOps(...extentOpsArgs);

  // The brand represents recognition of the units as authorized.
  const brand = new WeakSet();

  const unitOps = harden({
    getLabel() {
      return label;
    },

    getExtentOps: () =>
      harden({
        name: extentOpsName,
        args: extentOpsArgs,
      }),

    // Given the raw extent that this kind of units would label, return
    // a units so labeling that extent.
    make(allegedExtent) {
      extentOps.insistKind(allegedExtent);
      const units = harden({
        label,
        extent: allegedExtent,
      });
      brand.add(units);
      return units;
    },

    // Is this like a units object made by this unitOps, such as one
    // received by pass-by-copy from an otherwise-identical remote
    // units? On success, return a units object made by this
    // unitOps. Otherwise error.
    //
    coerce(allegedUnits) {
      if (brand.has(allegedUnits)) {
        return allegedUnits;
      }
      if (!Object.prototype.hasOwnProperty.call(allegedUnits, 'extent')) {
        // This is not a units. Let's see if it's a extent. Will
        // throw on inappropriate extent.
        return unitOps.make(allegedUnits);
      }
      const { label: allegedLabel, extent } = allegedUnits;
      mustBeSameStructure(label, allegedLabel, 'Unrecognized label');
      // Will throw on inappropriate extent
      return unitOps.make(extent);
    },

    // Return the raw extent that this units labels.
    extent(units) {
      return unitOps.coerce(units).extent;
    },

    // Represents the empty set of erights, i.e., no erights
    empty() {
      return unitOps.make(extentOps.empty());
    },

    isEmpty(units) {
      return extentOps.isEmpty(unitOps.extent(units));
    },

    // Set inclusion of erights.
    // Does the set of erights described by `leftUnits` include all
    // the erights described by `rightUnits`?
    includes(leftUnits, rightUnits) {
      const leftExtent = unitOps.extent(leftUnits);
      const rightExtent = unitOps.extent(rightUnits);
      return extentOps.includes(leftExtent, rightExtent);
    },

    equals(leftUnits, rightUnits) {
      const leftExtent = unitOps.extent(leftUnits);
      const rightExtent = unitOps.extent(rightUnits);
      return extentOps.equals(leftExtent, rightExtent);
    },

    // Set union of erights.
    // Combine the units described by 'leftUnits' and 'rightUnits'.
    with(leftUnits, rightUnits) {
      const leftExtent = unitOps.extent(leftUnits);
      const rightExtent = unitOps.extent(rightUnits);
      return unitOps.make(extentOps.with(leftExtent, rightExtent));
    },

    // Covering set subtraction of erights.
    // If leftUnits does not include rightUnits, error.
    // Return the units included in 'leftUnits' but not included in 'rightUnits'.
    without(leftUnits, rightUnits) {
      const leftExtent = unitOps.extent(leftUnits);
      const rightExtent = unitOps.extent(rightUnits);
      return unitOps.make(extentOps.without(leftExtent, rightExtent));
    },
  });
  return unitOps;
}
harden(makeUnitOps);

export { makeUnitOps };
