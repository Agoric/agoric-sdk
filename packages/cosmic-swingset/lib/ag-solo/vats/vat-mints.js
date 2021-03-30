import { Far } from '@agoric/marshal';
import { makeIssuerKit } from '@agoric/ertp';

import makeStore from '@agoric/store';

// This vat contains two starting mints for demos: moolaMint and
// simoleanMint.

export function buildRootObject(_vatPowers) {
  const mintsAndMath = makeStore('issuerName');

  const api = Far('api', {
    getAllIssuerNames: () => mintsAndMath.keys(),
    getIssuer: issuerName => {
      const mint = mintsAndMath.get(issuerName);
      return mint.getIssuer();
    },
    getIssuers: issuerNames => issuerNames.map(api.getIssuer),

    // NOTE: having a reference to a mint object gives the ability to mint
    // new digital assets, a very powerful authority. This authority
    // should be closely held.
    getMint: name => mintsAndMath.get(name).mint,
    getMints: issuerNames => issuerNames.map(api.getMint),
    // For example, issuerNameSingular might be 'moola', or 'simolean'
    makeMintAndIssuer: (issuerNameSingular, ...issuerArgs) => {
      const { mint, issuer, amountMath } = makeIssuerKit(
        issuerNameSingular,
        ...issuerArgs,
      );
      mintsAndMath.init(issuerNameSingular, { mint, amountMath });
      return issuer;
    },
    mintInitialPayment: (issuerName, value) => {
      if (!mintsAndMath.has(issuerName)) {
        return undefined;
      }
      const { mint, amountMath } = mintsAndMath.get(issuerName);
      const amount = amountMath.make(value);
      return mint.mintPayment(amount);
    },
    mintInitialPayments: (issuerNames, values) =>
      issuerNames.map((issuerName, i) =>
        api.mintInitialPayment(issuerName, values[i]),
      ),
  });

  return api;
}
