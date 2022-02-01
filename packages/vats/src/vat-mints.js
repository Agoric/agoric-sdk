import { Far } from '@endo/far';
import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { makeStore } from '@agoric/store';

// This vat contains two starting mints for demos: moolaMint and
// simoleanMint.

export function buildRootObject(_vatPowers) {
  const mintsAndBrands = makeStore('issuerName');

  const api = Far('api', {
    getAllIssuerNames: () => mintsAndBrands.keys(),
    getIssuer: issuerName => {
      const mint = mintsAndBrands.get(issuerName);
      return mint.getIssuer();
    },
    getIssuers: issuerNames => issuerNames.map(api.getIssuer),

    // NOTE: having a reference to a mint object gives the ability to mint
    // new digital assets, a very powerful authority. This authority
    // should be closely held.
    getMint: name => mintsAndBrands.get(name).mint,
    getMints: issuerNames => issuerNames.map(api.getMint),
    // For example, issuerNameSingular might be 'moola', or 'simolean'
    makeMintAndIssuer: (issuerNameSingular, ...issuerArgs) => {
      const { mint, issuer, brand } = makeIssuerKit(
        issuerNameSingular,
        ...issuerArgs,
      );
      mintsAndBrands.init(issuerNameSingular, { mint, brand });
      return issuer;
    },
    mintInitialPayment: (issuerName, value) => {
      if (!mintsAndBrands.has(issuerName)) {
        return undefined;
      }
      const { mint, brand } = mintsAndBrands.get(issuerName);
      const amount = AmountMath.make(brand, value);
      return mint.mintPayment(amount);
    },
    mintInitialPayments: (issuerNames, values) =>
      issuerNames.map((issuerName, i) =>
        api.mintInitialPayment(issuerName, values[i]),
      ),
  });

  return api;
}
