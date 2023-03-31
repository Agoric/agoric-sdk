import { Far } from '@endo/marshal';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * A Faucet providing Minted so we can provide initial liquidity where it's
 * needed.
 *
 * @param {ZCF} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export async function start(zcf, { feeMintAccess }) {
  const istMint = await zcf.registerFeeMint('IST', feeMintAccess);

  function makeFaucetInvitation() {
    /** @param {ZCFSeat} seat */
    async function faucetHook(seat) {
      assertProposalShape(seat, { want: { IST: null } });

      const {
        want: { IST: istAmount },
      } = seat.getProposal();
      istMint.mintGains(harden({ IST: istAmount }), seat);
      seat.exit();
      return `success ${istAmount.value}`;
    }

    return zcf.makeInvitation(faucetHook, 'provide IST');
  }

  const creatorFacet = Far('faucetInvitationMaker', { makeFaucetInvitation });
  return harden({ creatorFacet });
}
