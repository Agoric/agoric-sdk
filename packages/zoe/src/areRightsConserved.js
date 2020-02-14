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
 * The columns in a `amount` matrix are per issuer, and the rows
 * are per offer. We want to transpose the matrix such that each
 * row is per issuer so we can do 'with' on the array to get a total
 * per issuer and make sure the rights are conserved.
 * @param  {amountMath[]} amountMathArray - an array of amountMath per issuer
 * @param  {amount[][]} amountMatrix - an array of arrays with a row per
 * offer indexed by issuer
 */
const sumByIssuer = (amountMathArray, amountMatrix) =>
  transpose(amountMatrix).map((amountPerIssuer, i) =>
    amountPerIssuer.reduce(
      amountMathArray[i].add,
      amountMathArray[i].getEmpty(),
    ),
  );

/**
 * Does the left array of summed amount equal the right array of
 * summed amount?
 * @param  {amountMath[]} amountMathArray - an array of amountMath per issuer
 * @param  {amount[]} leftAmounts- an array of total amount per issuer
 * @param  {amount[]} rightAmounts - an array of total amount per issuer
 * indexed by issuer
 */
const isEqualPerIssuer = (amountMaths, leftAmounts, rightAmounts) =>
  leftAmounts.every((leftAmount, i) =>
    amountMaths[i].isEqual(leftAmount, rightAmounts[i]),
  );

/**
 * `areRightsConserved` checks that the total amount per issuer stays
 * the same regardless of the reallocation.
 * @param  {amountMath[]} amountMathArray - an array of amountMath per issuer
 * @param  {amount[][]} previousAmountsMatrix - array of arrays where a row
 * is the array of amount for a particular offer, per
 * issuer
 * @param  {amount[][]} newAmountsMatrix - array of arrays where a row
 * is the array of reallocated amount for a particular offer, per
 * issuer
 */
function areRightsConserved(
  amountMaths,
  previousAmountsMatrix,
  newAmountsMatrix,
) {
  const sumsPrevAmounts = sumByIssuer(amountMaths, previousAmountsMatrix);
  const sumsNewAmounts = sumByIssuer(amountMaths, newAmountsMatrix);
  return isEqualPerIssuer(amountMaths, sumsPrevAmounts, sumsNewAmounts);
}

export { areRightsConserved, transpose };
