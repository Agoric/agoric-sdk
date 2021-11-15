// @ts-check
import { AmountMath } from '@agoric/ertp';
import { Far } from '@agoric/marshal';
import {
  assertIsRatio,
  assertProposalShape,
  ceilMultiplyBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';

const { details: X, quote: q } = assert;

/**
 * @param { ContractFacet } zcf
 * @param {{ feeMintAccess: FeeMintAccess }} privateArgs
 */
const start = async (zcf, privateArgs) => {
  const {
    governedParams,
    issuers,
    collateralPrice,
    collateralizationRate,
  } = zcf.getTerms();
  assertIsRatio(collateralPrice);
  assertIsRatio(collateralizationRate);
  const { feeMintAccess } = privateArgs;

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand, issuer: runIssuer } = runMint.getIssuerRecord();

  const revealRunBrandToTest = () => {
    return harden({ runMint, runBrand, runIssuer });
  };
  zcf.setTestJig(revealRunBrandToTest);

  assert(
    collateralPrice.numerator.brand === runBrand,
    X`${collateralPrice} not in RUN`,
  );

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

    assert(Array.isArray(a.value));
    // TODO: check that we need to check address here
    const [{ address, amountLiened }] = a.value;
    const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
    const collateralizedRun = ceilMultiplyBy(runWanted, collateralizationRate);
    assert(
      AmountMath.isGTE(maxAvailable, collateralizedRun),
      X`${amountLiened} at price ${collateralPrice} not enough to borrow ${runWanted} with ${collateralizationRate}`,
    );
    runMint.mintGains(harden({ RUN: runWanted }), seat);
    seat.exit();
    return `borrowed ${q(runWanted)} against ${q(amountLiened)} at price ${q(
      collateralPrice,
    )} and rate ${q(collateralizationRate)}`;
  };

  const publicFacet = Far('Line of Credit API', {
    getInvitation: () => zcf.makeInvitation(handleOffer, 'RUN Line of Credit'),
  });

  return { publicFacet };
};

harden(start);
export { start };
