// @ts-check
import { E } from '@agoric/eventual-send';
import { makeScalarWeakMap } from '@agoric/store';

// Note: input validation done elsewhere.

const { details: X } = assert;

const holdEscrowPurses = () => {
  /** @type {WeakStore<Brand, ERef<Purse>>} */
  const brandToPurse = makeScalarWeakMap('brand');

  /**
   * Add issuer so that assets of this brand can be escrowed. Creates
   * a purse so that payments of this brand can be deposited. Note
   * that all funds of the same brand are intermingled in the same purse.
   *
   * @param {ERef<Issuer>} issuer
   * @returns {Promise<void>}
   */
  const addIssuer = async issuer => {
    const brandP = E(issuer).getBrand();
    const issuerMatchesP = E(brandP).isMyIssuer(issuer);
    const purseP = E(issuer).makeEmptyPurse();

    const [brand, issuerMatches, purse] = await Promise.all([
      brandP,
      issuerMatchesP,
      purseP,
    ]);
    assert(issuerMatches, X`issuer ${issuer} did not match ${brand}`);
    brandToPurse.init(brand, purse);
  };

  /**
   * TODO: think about whether the promises are optimized
   *
   * @param {Array<ERef<Payment>>} payments
   * @returns {Promise<Array<Amount>>}
   */
  const depositPayments = async payments => {
    const allegedBrands = await Promise.all(
      payments.map(payment => E(payment).getAllegedBrand()),
    );
    return Promise.all(
      payments.map((paymentP, i) => {
        const allegedBrand = allegedBrands[i];
        const purse = brandToPurse.get(allegedBrand);
        return E.when(paymentP, payment => E(purse).deposit(payment));
      }),
    );
  };

  /**
   *
   * TODO: validate amounts or confirm validated elsewhere
   *
   * @param {Array<Amount>} amounts
   * @returns {Array<Promise<Payment>>}
   */
  const withdrawPayments = amounts => {
    const paymentPs = amounts.map(amount => {
      const purse = brandToPurse.get(amount.brand);
      return E(purse).withdraw(amount);
    });
    harden(paymentPs);
    return paymentPs;
  };

  return harden({ depositPayments, withdrawPayments, addIssuer });
};
harden(holdEscrowPurses);
export { holdEscrowPurses };
