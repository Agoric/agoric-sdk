/**
 * Transpose an array of arrays
 * @param {matrix} matrix
 */
// https://stackoverflow.com/questions/17428587/transposing-a-2d-array-in-javascript/41772644#41772644
const transpose = matrix =>
  matrix.reduce(
    (acc, row) => row.map((_, i) => [...(acc[i] || []), row[i]]),
    [],
  );

/**
 * The columns in a `extents` matrix are per assay, and the rows
 * are per offer. We want to transpose the matrix such that each
 * row is per assay so we can do 'with' on the array to get a total
 * per assay and make sure the rights are conserved.
 * @param  {extentOps[]} extentOpsArray - an array of extentOps per assay
 * @param  {extent[][]} extentsMatrix - an array of arrays with a row per
 * offer indexed by assay
 */
const sumByAssay = (extentOpsArray, extentsMatrix) =>
  transpose(extentsMatrix).map((extentsPerAssay, i) =>
    extentsPerAssay.reduce(extentOpsArray[i].with, extentOpsArray[i].empty()),
  );

/**
 * Does the left array of summed extents equal the right array of
 * summed extents?
 * @param  {extentOps[]} extentOpsArray - an array of extentOps per assay
 * @param  {extent[]} leftExtentsArray - an array of total extents per assay
 * @param  {extent[]} rightExtentsArray - an array of total extents per assay
 * indexed by assay
 */
const isEqualPerAssay = (extentOpsArray, leftExtentsArray, rightExtentsArray) =>
  leftExtentsArray.every((leftExtent, i) =>
    extentOpsArray[i].equals(leftExtent, rightExtentsArray[i]),
  );

/**
 * `areRightsConserved` checks that the total extent per assay stays
 * the same regardless of the reallocation.
 * @param  {extentOps[]} extentOpsArray - an array of extentOps per assay
 * @param  {extent[][]} previousExtentsMatrix - array of arrays where a row
 * is the array of extents for a particular offer, per
 * assay
 * @param  {extent[][]} newExtentsMatrix - array of arrays where a row
 * is the array of reallocated extents for a particular offer, per
 * assay
 */
function areRightsConserved(
  extentOpsArray,
  previousExtentsMatrix,
  newExtentsMatrix,
) {
  const sumsPrevExtents = sumByAssay(extentOpsArray, previousExtentsMatrix);
  const sumsNewExtents = sumByAssay(extentOpsArray, newExtentsMatrix);
  return isEqualPerAssay(extentOpsArray, sumsPrevExtents, sumsNewExtents);
}

export { areRightsConserved, transpose };
