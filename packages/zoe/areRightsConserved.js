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
 * The columns in a `units` matrix are per assay, and the rows
 * are per offer. We want to transpose the matrix such that each
 * row is per assay so we can do 'with' on the array to get a total
 * per assay and make sure the rights are conserved.
 * @param  {unitOps[]} unitOpsArray - an array of unitOps per assay
 * @param  {units[][]} unitsMatrix - an array of arrays with a row per
 * offer indexed by assay
 */
const sumByAssay = (unitOpsArray, unitsMatrix) =>
  transpose(unitsMatrix).map((unitsPerAssay, i) =>
    unitsPerAssay.reduce(unitOpsArray[i].with, unitOpsArray[i].empty()),
  );

/**
 * Does the left array of summed units equal the right array of
 * summed units?
 * @param  {unitOps[]} unitOpsArray - an array of unitOps per assay
 * @param  {units[]} leftUnitsArray - an array of total units per assay
 * @param  {units[]} rightUnitsArray - an array of total units per assay
 * indexed by assay
 */
const isEqualPerAssay = (unitOpsArray, leftUnitsArray, rightUnitsArray) =>
  leftUnitsArray.every((leftUnits, i) =>
    unitOpsArray[i].equals(leftUnits, rightUnitsArray[i]),
  );

/**
 * `areRightsConserved` checks that the total units per assay stays
 * the same regardless of the reallocation.
 * @param  {unitOps[]} unitOpsArray - an array of unitOps per assay
 * @param  {unit[][]} previousUnitsMatrix - array of arrays where a row
 * is the array of units for a particular offer, per
 * assay
 * @param  {unit[][]} newUnitsMatrix - array of arrays where a row
 * is the array of reallocated units for a particular offer, per
 * assay
 */
function areRightsConserved(unitOpsArray, previousUnitsMatrix, newUnitsMatrix) {
  const sumsPrevUnits = sumByAssay(unitOpsArray, previousUnitsMatrix);
  const sumsNewUnits = sumByAssay(unitOpsArray, newUnitsMatrix);
  return isEqualPerAssay(unitOpsArray, sumsPrevUnits, sumsNewUnits);
}

export { areRightsConserved, transpose };
