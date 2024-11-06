/**
 * @import {Zone} from '@agoric/zone';
 * @import {USDCProposalShapes} from '../pool-share-math.js'
 */

import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import {
  deposit as depositCalc,
  makeParity,
  withdraw as withdrawCalc,
} from '../pool-share-math.js';
import { makeProposalShapes } from '../type-guards.js';

/**
 * @param {Zone} zone
 * @param {ZCF} zcf
 * @param {Record<'USDC', Brand<'nat'>>} brands
 */
export const prepareLiquidityPoolKit = (zone, zcf, brands) => {
  return zone.exoClassKit(
    'Fast Liquidity Pool',
    {
      depositHandler: M.interface('depositHandler', {
        handle: M.call(SeatShape, M.any()).returns(undefined),
      }),
      withdrawHandler: M.interface('withdrawHandler', {
        handle: M.call(SeatShape, M.any()).returns(undefined),
      }),
      public: M.interface('public', {
        makeDepositInvitation: M.call().returns(M.promise()),
        makeWithdrawInvitation: M.call().returns(M.promise()),
      }),
    },
    /**
     * @param {ZCFMint<'nat'>} shareMint
     */
    shareMint => {
      const { brand: PoolShares } = shareMint.getIssuerRecord();
      const { USDC } = brands;
      const proposalShapes = makeProposalShapes({ USDC, PoolShares });
      const dust = AmountMath.make(USDC, 1n);
      const shareWorth = makeParity(dust, PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      return { shareMint, shareWorth, poolSeat, PoolShares, proposalShapes };
    },
    {
      depositHandler: {
        /** @param {ZCFSeat} lp */
        handle(lp) {
          const { shareWorth, shareMint, poolSeat } = this.state;
          /** @type {USDCProposalShapes['deposit']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          const post = depositCalc(shareWorth, proposal);
          // COMMIT POINT
          const mint = shareMint.mintGains(post.payouts);
          zcf.atomicRearrange(
            harden([
              [lp, poolSeat, proposal.give],
              [mint, lp, post.payouts],
            ]),
          );
          this.state.shareWorth = post.shareWorth;
          lp.exit();
          mint.exit();
        },
      },
      withdrawHandler: {
        /** @param {ZCFSeat} lp */
        handle(lp) {
          const { shareWorth, shareMint, poolSeat } = this.state;
          /** @type {USDCProposalShapes['withdraw']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          const { zcfSeat: burn } = zcf.makeEmptySeatKit();
          const post = withdrawCalc(shareWorth, proposal);
          // COMMIT POINT
          zcf.atomicRearrange(
            harden([
              [lp, burn, proposal.give],
              [poolSeat, lp, post.payouts],
            ]),
          );
          shareMint.burnLosses(proposal.give, burn);
          this.state.shareWorth = post.shareWorth;
          lp.exit();
          burn.exit();
        },
      },
      public: {
        makeDepositInvitation() {
          const { depositHandler: handler } = this.facets;
          const { deposit: shape } = this.state.proposalShapes;
          return zcf.makeInvitation(handler, 'Deposit', undefined, shape);
        },
        makeWithdrawInvitation() {
          const { withdrawHandler: handler } = this.facets;
          const { withdraw: shape } = this.state.proposalShapes;
          return zcf.makeInvitation(handler, 'Withdraw', undefined, shape);
        },
      },
    },
  );
};
harden(prepareLiquidityPoolKit);
