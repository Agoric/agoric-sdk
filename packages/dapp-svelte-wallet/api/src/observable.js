export default function makeObservablePurse(E, purse, onFulfilled) {
  return {
    makeDepositFacet() {
      return E(purse)
        .makeDepositFacet()
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
