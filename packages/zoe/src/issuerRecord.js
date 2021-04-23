/**
 * Put together information about the issuer in a standard format that
 * is synchronously accessible.
 *
 * @param {Brand} brand
 * @param {Issuer} issuer
 * @param {AmountMathKind} amountMathKind
 * @param {DisplayInfo=} displayInfo
 * @returns {IssuerRecord}
 */
export const makeIssuerRecord = (brand, issuer, amountMathKind, displayInfo) =>
  harden({
    brand,
    issuer,
    mathKind: amountMathKind,
    displayInfo: { ...displayInfo, amountMathKind },
  });
