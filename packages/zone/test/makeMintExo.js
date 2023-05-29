/* eslint-disable import/no-extraneous-dependencies */
import { makeWeakMap } from 'jessie.js';
import { Nat } from '@endo/nat';

/**
 * Mint maker, transformed to an exo class kit.
 *
 * @param {import('@agoric/zone').Zone} zone
 */
export const prepareIssuerKit = zone => {
  const makePurse = zone.exoClass(
    'Purse',
    undefined,
    (issuer, ledger) => ({ issuer, ledger }),
    {
      getIssuer() {
        return this.state.issuer;
      },
      getBalance() {
        const { self } = this;
        return this.state.ledger.get(self);
      },
      /**
       * @param {bigint} amount
       * @param {unknown} src
       */
      deposit(amount, src) {
        const { self } = this;
        const { ledger } = this.state;
        Nat(ledger.get(self) + Nat(amount));
        ledger.set(src, Nat(ledger.get(src) - amount));
        ledger.set(self, ledger.get(self) + amount);
      },
      withdraw(amount) {
        const { self } = this;
        const { issuer } = this.state;
        const newPurse = issuer.makeEmptyPurse();
        newPurse.deposit(amount, self);
        return newPurse;
      },
    },
  );

  const makeIssuerKit = zone.exoClassKit(
    'Mint',
    undefined, // TODO: interface guard kit
    () => ({
      /** @type {WeakMap<unknown, bigint>} */
      ledger: makeWeakMap(),
    }),
    {
      issuer: {
        makeEmptyPurse() {
          const { mint } = this.facets;
          return mint.makePurse(0n);
        },
      },
      mint: {
        /** @param {bigint} initialBalance */
        makePurse(initialBalance) {
          const { issuer } = this.facets;
          const { ledger } = this.state;
          const purse = makePurse(issuer, ledger);
          ledger.set(purse, initialBalance);
          return purse;
        },
      },
    },
  );

  return makeIssuerKit;
};
