import { transpose } from '../contractUtils';

/**
 * The columns in a `extents` matrix are per assay, and the rows
 * are per player. We want to transpose the matrix such that each
 * row is per assay so we can do 'with' on the array to get a total
 * per assay and make sure the rights are conserved.
 * @param  {extentOps[]} extentOps - an array of extentOps per assay
 * @param  {extent[]} extents - an array of arrays with a row per
 * player indexed by assay
 */
const sumByAssay = (extentOps, extents) =>
  transpose(extents).map((extentsPerAssay, i) =>
    extentsPerAssay.reduce(extentOps[i].with, extentOps[i].empty()),
  );

/**
 * Does the left array of summed extents equal the right array of
 * summed extents?
 * @param  {extentOps[]} extentOps - an array of extentOps per assay
 * @param  {extent[]} leftExtents - an array of total extents per assay
 * @param  {extent[]} rightExtents - an array of total extents per assay
 * indexed by assay
 */
const isEqualPerAssay = (extentOps, leftExtents, rightExtents) =>
  leftExtents.every(
    (leftQ, i) => extentOps[i].equals(leftQ, rightExtents[i]),
    true,
  );

/**
 * `areRightsConserved` checks that the total extent per assay stays
 * the same regardless of the reallocation.
 * @param  {extentOps[]} extentOps - an array of extentOps per assay
 * @param  {extent[][]} previousExtents - array of arrays where a row
 * is the array of extents for a particular player, per
 * assay
 * @param  {extent[][]} newExtents - array of arrays where a row
 * is the array of reallocated extents for a particular player, per
 * assay
 */
function areRightsConserved(extentOps, prevExtents, newExtents) {
  const sumsPrevExtents = sumByAssay(extentOps, prevExtents);
  const sumsNewExtents = sumByAssay(extentOps, newExtents);
  return isEqualPerAssay(extentOps, sumsPrevExtents, sumsNewExtents);
}

export { areRightsConserved };
