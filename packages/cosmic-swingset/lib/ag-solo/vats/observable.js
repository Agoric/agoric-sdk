export default function makeObservablePurse(E, purse, onFulfilled) {
  return {
    getName() {
      return E(purse).getName();
    },
    getAssay() {
      return E(purse).getAssay();
    },
    getBalance() {
      return E(purse).getBalance();
    },
    depositExactly(...args) {
      return E(purse)
        .depositExactly(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
    depositAll(...args) {
      return E(purse)
        .depositAll(...args)
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
    withdrawAll(...args) {
      return E(purse)
        .withdrawAll(...args)
        .then(result => {
          onFulfilled();
          return result;
        });
    },
  };
}
