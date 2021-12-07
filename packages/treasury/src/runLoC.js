// @ts-check
import { AmountMath } from '@agoric/ertp';
import { handleParamGovernance } from '@agoric/governance';
import { Far } from '@agoric/marshal';
import {
  assertIsRatio,
  assertProposalShape,
  ceilMultiplyBy,
  floorMultiplyBy,
} from '@agoric/zoe/src/contractSupport/index.js';

const { details: X, quote: q } = assert;

export const CreditTerms = {
  CollateralPrice: 'CollateralPrice',
  CollateralizationRate: 'CollateralizationRate',
};

/**
 * @param { ContractFacet } zcf
 * @param {{ feeMintAccess: FeeMintAccess }} privateArgs
 */
const start = async (zcf, { feeMintAccess }) => {
  const { main: initialValue, brands } = zcf.getTerms();

  const {
    makePublicFacet,
    makeCreatorFacet,
    getParamValue,
  } = handleParamGovernance(zcf, harden(initialValue));
  const getRatio = name => {
    const x = getParamValue(name);
    assertIsRatio(x);
    return /** @type { Ratio } */ (x);
  };

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand, issuer: runIssuer } = runMint.getIssuerRecord();

  const revealRunBrandToTest = () => {
    return harden({ runMint, runBrand, runIssuer });
  };
  zcf.setTestJig(revealRunBrandToTest);

  /** @type { OfferHandler } */
  const handleOffer = (seat, _offerArgs = undefined) => {
    const collateralPrice = getRatio(CreditTerms.CollateralPrice);
    const collateralizationRate = getRatio(CreditTerms.CollateralizationRate);
    assert(
      collateralPrice.numerator.brand === runBrand,
      X`${collateralPrice} not in RUN`,
    );

    assertProposalShape(seat, {
      give: { Attestation: null },
      want: { RUN: null },
    });
    const {
      give: { Attestation: attAmt },
      want: { RUN: runWanted },
    } = seat.getProposal();

    assert(
      attAmt.brand === brands.Attestation,
      X`Invalid Attestation ${attAmt}. Expected brand ${brands.Attestation}`,
    );
    assert(
      Array.isArray(attAmt.value) && attAmt.value.length === 1,
      X`expected SET value with 1 item; found ${attAmt.value}`,
    );
    // NOTE: we accept any address
    const [{ address, amountLiened }] = attAmt.value;
    const maxAvailable = floorMultiplyBy(amountLiened, collateralPrice);
    const collateralizedRun = ceilMultiplyBy(runWanted, collateralizationRate);
    assert(
      AmountMath.isGTE(maxAvailable, collateralizedRun),
      X`${amountLiened} at price ${collateralPrice} not enough to borrow ${runWanted} with ${collateralizationRate}`,
    );
    runMint.mintGains(harden({ RUN: runWanted }), seat);
    seat.exit();
    return `borrowed ${q(runWanted)} against ${q(amountLiened)} at ${address}`;
  };

  const publicFacet = makePublicFacet(
    Far('Line of Credit API', {
      getInvitation: () =>
        zcf.makeInvitation(handleOffer, 'RUN Line of Credit'),
    }),
  );

  return { publicFacet, creatorFacet: makeCreatorFacet(undefined) };
};

harden(start);
export { start };
