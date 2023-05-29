// @ts-check
/* eslint-disable import/no-extraneous-dependencies */
import { makeWeakMap } from 'jessie.js';
import { Nat } from '@endo/nat';
import { NonNullish } from '@agoric/assert';

/**
 * The mint maker, in its original objects-as-closures form.
 *
 * taken from "From OCaps to Electronic Rights: Mint and Purse"
 * in "Hardened JS"
 * https://docs.agoric.com/guides/js-programming/hardened-js.html#from-ocaps-to-electronic-rights-mint-and-purse
 * with just 1 or 2 tweaks
 *
 * originally from "Simple Money" in the Financial Cryptography 2000 paper
 * http://erights.org/elib/capability/ode/ode-capabilities.html
 *
 */
export const makeMint = () => {
  /** @type {WeakMap<*, bigint>} */
  const ledger = makeWeakMap();

  const issuer = harden({
    // eslint-disable-next-line no-use-before-define
    makeEmptyPurse: () => mint.makePurse(0n),
  });

  const mint = harden({
    /** @param {bigint} initialBalance */
    makePurse: initialBalance => {
      const purse = harden({
        getIssuer: () => issuer,
        getBalance: () => ledger.get(purse),

        /**
         * @param {bigint} amount
         * @param {unknown} src
         */
        deposit: (amount, src) => {
          Nat(NonNullish(ledger.get(purse)) + Nat(amount));
          ledger.set(src, Nat(NonNullish(ledger.get(src)) - amount));
          ledger.set(purse, NonNullish(ledger.get(purse)) + amount);
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
