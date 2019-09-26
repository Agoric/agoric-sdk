import harden from '@agoric/harden';

function makeAliceMaker(E, log) {
  return harden({
    make(myMoneyPurseP) {
      const alice = harden({
        async testSplitPayments() {
          const oldPayment = await E(myMoneyPurseP).withdrawAll();
          log('oldPayment balance:', await E(oldPayment).getBalance());
          const issuer = await E(myMoneyPurseP).getIssuer();
          const goodAmountsArray = [
            await E(issuer).makeAmount(900),
            await E(issuer).makeAmount(100),
          ];
          const splitPayments = await E(issuer).split(
            oldPayment,
            goodAmountsArray,
          );
          log(
            'splitPayment[0] balance: ',
            await E(splitPayments[0]).getBalance(),
          );
        },
      });
      return alice;
    },
  });
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(E, log, host));
      },
    }),
  );
}
export default harden(setup);
