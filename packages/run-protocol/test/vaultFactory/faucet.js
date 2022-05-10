// @ts-check

import { Far } from '@endo/marshal';
import { assertProposalShape } from '@agoric/zoe/src/contractSupport/index.js';
import { Stable } from '../../src/tokens.js';

/**
 * A Faucet providing RUN so we can provide initial liquidity to the AMM so the
 * VaultFactory can reliably liquidate.
 *
 * @param {ZCF} zcf
 * @param {{feeMintAccess: FeeMintAccess}} privateArgs
 */
export async function start(zcf, { feeMintAccess }) {
  const runMint = await zcf.registerFeeMint(Stable.symbol, feeMintAccess);

  function makeFaucetInvitation() {
    /** @param {ZCFSeat} seat */
    async function faucetHook(seat) {
      assertProposalShape(seat, { want: { [Stable.symbol]: null } });

      const {
        want: { [Stable.symbol]: runAmount },
      } = seat.getProposal();
      runMint.mintGains(harden({ [Stable.symbol]: runAmount }), seat);
      seat.exit();
      return `success ${runAmount.value}`;
    }

    return zcf.makeInvitation(faucetHook, 'provide RUN');
  }

  const creatorFacet = Far('faucetInvitationMaker', { makeFaucetInvitation });
  return harden({ creatorFacet });
}
