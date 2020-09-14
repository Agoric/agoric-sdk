/**
 * @param {import("@agoric/eventual-send").EProxy} E
 * @param {Purse} purse
 * @param {() => void} onFulfilled
 * @returns {Purse}
 */
export default function makeObservablePurse(E, purse, onFulfilled) {
  return {
    getDepositFacet() {
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
