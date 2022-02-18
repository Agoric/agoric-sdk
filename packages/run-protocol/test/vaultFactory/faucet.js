// @ts-check

import { Far } from '@endo/marshal';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

// A Faucet providing RUN so we can provide initial liquidity to the AMM so the
// VaultFactory can reliably liquidate.

/** @type {ContractStartFn} */
export const start = async (zcf, privateArgs) => {
  const { feeMintAccess } = privateArgs;
  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);

  const makeFaucetInvitation = () => {
    /** @param {ZCFSeat} seat */
    const faucetHook = async seat => {
      assertProposalShape(seat, { want: { RUN: null } });

      const {
        want: { RUN: runAmount },
      } = seat.getProposal();
      runMint.mintGains(harden({ RUN: runAmount }), seat);
      seat.exit();
      return `success ${runAmount.value}`;
    };

    return zcf.makeInvitation(faucetHook, 'provide RUN');
  };

  const creatorFacet = Far('faucetInvitationMaker', { makeFaucetInvitation });
  return harden({ creatorFacet });
};
