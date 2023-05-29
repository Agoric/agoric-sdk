/* eslint-disable import/no-extraneous-dependencies */
import { makeWeakMap } from 'jessie.js';
import { Nat } from '@endo/nat';

export const makeMint = () => {
  const ledger = makeWeakMap();

  const issuer = harden({
    // eslint-disable-next-line no-use-before-define
    makeEmptyPurse: () => mint.makePurse(0n),
  });

  const mint = harden({
    makePurse: initialBalance => {
      const purse = harden({
        getIssuer: () => issuer,
        getBalance: () => ledger.get(purse),

        deposit: (amount, src) => {
          Nat(ledger.get(purse) + Nat(amount));
          ledger.set(src, Nat(ledger.get(src) - amount));
          ledger.set(purse, ledger.get(purse) + amount);
        },
        withdraw: amount => {
          const newPurse = issuer.makeEmptyPurse();
          newPurse.deposit(amount, purse);
          return newPurse;
        },
      });
      ledger.set(purse, initialBalance);
      return purse;
    },
  });

  return mint;
};
