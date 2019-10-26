import harden from '@agoric/harden';
import { E } from '@agoric/eventual-send';

import makePromise from '../../../util/makePromise';
import { insist } from '../../../util/insist';
import { toAssetDescMatrix } from '../contractUtils';

// These utilities are used within Zoe itself. Importantly, there is
// no ambient authority for these utilities. Any authority must be
// passed in, making it easy to see which functions can affect what.
const mintPayoutPayment = (
  seatMint,
  addUseObj,
  offerConditions,
  result,
  instanceHandle,
) => {
  const payoutExtent = harden({
    offerHandle: harden({}),
    offerConditions,
    instanceHandle,
  });
  const payoutPurseP = seatMint.mint(payoutExtent);
  const seat = harden({
    getPayout: () => result.p,
  });
  addUseObj(payoutExtent.offerHandle, seat);
  return payoutPurseP.withdrawAll();
};

const mintEscrowReceiptPayment = (
  escrowReceiptMint,
  offerHandle,
  offerConditions,
) => {
  const escrowReceiptExtent = harden({
    offerHandle,
    offerConditions,
  });
  const escrowReceiptPurse = escrowReceiptMint.mint(escrowReceiptExtent);
  const escrowReceiptPaymentP = escrowReceiptPurse.withdrawAll();
  return escrowReceiptPaymentP;
};

const escrowPayment = async (offerDescElem, offerPayment, purse, extentOps) => {
  // if the user's contractual understanding includes
  // "offerExactly" or "offerAtMost", make sure that they have supplied a
  // payment with that exact balance
  if (['offerExactly', 'offerAtMost'].includes(offerDescElem.rule)) {
    const { extent } = await E(purse).depositExactly(
      offerDescElem.assetDesc,
      offerPayment,
    );
    return extent;
  }
  insist(
    offerPayment === undefined,
  )`payment was included, but the rule was ${offerDescElem.rule}`;
  return extentOps.empty();
};

const insistValidRules = offerDesc => {
  const acceptedRules = [
    'offerExactly',
    'offerAtMost',
    'wantExactly',
    'wantAtLeast',
  ];
  for (const offerDescElement of offerDesc) {
    insist(
      acceptedRules.includes(offerDescElement.rule),
    )`rule ${offerDescElement.rule} is not one of the accepted rules`;
  }
};

const insistValidExitCondition = exit => {
  const acceptedExitConditionKinds = [
    'noExit',
    'onDemand',
    'afterDeadline',
    // 'onDemandAfterDeadline', // not yet supported
  ];

  insist(
    acceptedExitConditionKinds.includes(exit.kind),
  )`exit ${exit} is not one of the accepted options`;
};

const escrowOffer = async (
  recordOffer,
  recordAssay,
  offerConditions,
  offerPayments,
) => {
  const result = makePromise();
  const { offerDesc, exit = { kind: 'onDemand' } } = offerConditions;

  insistValidRules(offerDesc);
  insistValidExitCondition(exit);

  // Escrow the payments and store the assays from the offerDesc. We
  // assume that the offerDesc has elements for each expected assay,
  // and none are undefined.
  // TODO: handle bad offers more robustly
  const extents = await Promise.all(
    offerDesc.map(async (offerDescElem, i) => {
      const { assay } = offerDescElem.assetDesc.label;
      const { purse, extentOps } = await recordAssay(assay);
      return escrowPayment(offerDescElem, offerPayments[i], purse, extentOps);
    }),
  );

  const assays = offerDesc.map(offerDescElem => {
    const { assay } = offerDescElem.assetDesc.label;
    return assay;
  });

  const offerHandle = harden({});

  recordOffer(offerHandle, offerConditions, extents, assays, result);

  return harden({
    offerHandle,
    result,
  });
};

const escrowEmptyOffer = (recordOffer, assays, labels, extentOpsArray) => {
  const offerHandle = harden({});
  const offerDesc = labels.map((label, i) =>
    harden({
      rule: 'wantAtLeast',
      assetDesc: {
        label,
        extent: extentOpsArray[i].empty(),
      },
    }),
  );
  const offerConditions = harden({
    offerDesc,
    exit: {
      kind: 'onDemand',
    },
  });
  const extents = extentOpsArray.map(extentOps => extentOps.empty());
  const result = makePromise();

  // has side effects
  recordOffer(offerHandle, offerConditions, extents, assays, result);

  return harden({
    offerHandle,
    result,
  });
};

const makePayments = (purses, assetDescsMatrix) => {
  const paymentsMatrix = assetDescsMatrix.map(row => {
    const payments = Promise.all(
      row.map((assetDesc, i) => E(purses[i]).withdraw(assetDesc, 'payout')),
    );
    return payments;
  });
  return Promise.all(paymentsMatrix);
};

// Note: offerHandles must be for the same assays.
const completeOffers = async (adminState, readOnlyState, offerHandles) => {
  const { inactive } = readOnlyState.getStatusFor(offerHandles);
  if (inactive.length > 0) {
    throw new Error('offer has already completed');
  }
  adminState.setOffersAsInactive(offerHandles);
  const [assays] = readOnlyState.getAssaysFor(offerHandles);
  const extents = readOnlyState.getExtentsFor(offerHandles);
  const extentOps = readOnlyState.getExtentOpsArrayForAssays(assays);
  const labels = readOnlyState.getLabelsForAssays(assays);
  const assetDescs = toAssetDescMatrix(extentOps, labels, extents);
  const purses = adminState.getPurses(assays);
  const payments = await makePayments(purses, assetDescs);
  const results = adminState.getResultsFor(offerHandles);
  results.map((result, i) => result.res(payments[i]));
  adminState.removeOffers(offerHandles);
};

export {
  escrowEmptyOffer,
  escrowOffer,
  mintEscrowReceiptPayment,
  mintPayoutPayment,
  completeOffers,
};
