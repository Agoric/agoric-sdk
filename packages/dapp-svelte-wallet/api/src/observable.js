/**
 * @param {import("@agoric/eventual-send").EProxy} E
 * @param {Purse} purse
 * @param {() => void} onFulfilled
 * @return {Purse}
 */
export default function makeObservablePurse(E, purse, onFulfilled) {
  return {
    // TODO This `makeDepositFacet` does not seem to be used. Should it
    // be renamed `getDepositFacet`? Do we need to leave behind a deprecated
    // `makeDepositFacet` alias of this method, like we did in purse?
    makeDepositFacet() {
      return E(purse)
        .getDepositFacet()
        .then(depositOnlyFacet => {
          return {
            receive(...args) {
              E(depositOnlyFacet)
                .receive(...args)
                .then(result => {
                  onFulfilled();
                  return result;
                });
            },
          };
        });
    },
    getCurrentAmount() {
      return E(purse).getCurrentAmount();
    },
    getAllegedBrand() {
      return E(purse).getAllegedBrand();
    },
    deposit(...args) {
      return E(purse)
        .deposit(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
    withdraw(...args) {
      return E(purse)
        .withdraw(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
  };
}
