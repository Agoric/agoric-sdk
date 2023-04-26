import { AmountMath, AssetKind, makeIssuerKit } from '@agoric/ertp';
import { makeCopyBag } from '@agoric/store';
import { Far } from '@endo/marshal';

export const start = zcf => {
  const a = makeIssuerKit('Bogus', AssetKind.COPY_BAG);
  zcf.saveIssuer(a.issuer, 'Attestation');

  return {
    publicFacet: Far('pub', {
      /**
       * @param {string} address
       * @param {Amount<bigint>} amountLiened
       */
      fakeAttestation: (address, amountLiened) => {
        const attValue = AmountMath.make(
          a.brand,
          makeCopyBag([[address, amountLiened.value]]),
        );
        return a.mint.mintPayment(attValue);
      },
      getIssuer: () => a.issuer,
    }),
  };
};
