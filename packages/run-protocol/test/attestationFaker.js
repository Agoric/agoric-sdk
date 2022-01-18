import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { Far } from '@agoric/marshal';

/** @param { ContractFacet } zcf */
export const start = zcf => {
  const a = makeIssuerKit('Bogus', AssetKind.SET);
  zcf.saveIssuer(a.issuer, 'Attestation');

  return {
    publicFacet: Far('pub', {
      /**
       * @param { string } address
       * @param { Amount } amountLiened
       * @returns {[Amount, Payment]}
       */
      fakeAttestation: (address, amountLiened) => {
        const attValue = AmountMath.make(
          a.brand,
          harden([{ address, amountLiened }]),
        );
        return [attValue, a.mint.mintPayment(attValue)];
      },
    }),
  };
};
