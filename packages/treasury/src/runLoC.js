// @ts-check
import { Far } from '@agoric/marshal';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport';

/**
 * @param { ContractFacet } zcf
 * @param {{ feeMintAccess: FeeMintAccess }} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const { governedParams } = zcf.getTerms();
  const { feeMintAccess } = privateArgs;

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);

  const revealRunBrandToTest = () => {
    const { brand: runBrand, issuer: runIssuer } = runMint.getIssuerRecord();

    return harden({ runMint, runBrand, runIssuer });
  };
  zcf.setTestJig(revealRunBrandToTest);

  /** @type { OfferHandler } */
  const handleOffer = (seat, _offerArgs = undefined) => {
    assertProposalShape(seat, {
      give: { Attestation: null },
      want: { RUN: null },
    });
    const {
      give: { Attestation: a },
      want: { RUN: runWanted },
    } = seat.getProposal();

    console.log('@@TODO: check attestation', a);
    runMint.mintGains(harden({ RUN: runWanted }), seat);
    seat.exit();
    return '@@TODO: this transaction succeeded, but perhaps it should not have.';
  };

  const publicFacet = Far('Line of Credit API', {
    getInvitation: () => zcf.makeInvitation(handleOffer, 'RUN Line of Credit'),
  });

  return { publicFacet };
};

harden(start);
export { start };
