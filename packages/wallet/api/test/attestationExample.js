// @ts-check
import '@agoric/zoe/exported.js';
import { AmountMath } from '@agoric/ertp';
import { E } from '@endo/eventual-send';

/** @param {ZCF} zcf */
export const start = async zcf => {
  const mint = await zcf.makeZCFMint('Attestation');
  const { brand } = await mint.getIssuerRecord();
  const callHistory = {
    wantProposals: [],
    wantAllocations: [],
    returnProposals: [],
    returnAllocations: [],
  };

  const mintAttestation = ({ value }) => {
    const { userSeat, zcfSeat } = zcf.makeEmptySeatKit();
    mint.mintGains({ Attestation: AmountMath.make(brand, value) }, zcfSeat);
    zcfSeat.exit();
    return E(userSeat).getPayout('Attestation');
  };

  const wantAttHandler = seat => {
    const proposal = seat.getProposal();
    // @ts-expect-error
    callHistory.wantProposals.push(proposal);
    // @ts-expect-error
    callHistory.wantAllocations.push(seat.getCurrentAllocation());
    mint.mintGains(
      { Attestation: AmountMath.make(brand, proposal.want.Attestation.value) },
      seat,
    );
    seat.exit();
    return 'good job';
  };

  const returnAttHandler = seat => {
    const proposal = seat.getProposal();
    // @ts-expect-error
    callHistory.returnProposals.push(proposal);
    // @ts-expect-error
    callHistory.returnAllocations.push(seat.getCurrentAllocation());
    seat.exit();
    return 'thank you for that';
  };

  const makeWantAttInvitation = () =>
    zcf.makeInvitation(wantAttHandler, 'WantAtt');

  const makeReturnAttInvitation = () =>
    zcf.makeInvitation(returnAttHandler, 'ReturnAtt');

  const getCallHistory = () => callHistory;

  const publicFacet = {
    mintAttestation,
    makeWantAttInvitation,
    makeReturnAttInvitation,
    getCallHistory,
  };

  return harden({ publicFacet });
};
