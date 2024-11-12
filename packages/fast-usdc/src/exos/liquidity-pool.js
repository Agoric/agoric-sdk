import {
  AmountMath,
  AmountShape,
  PaymentShape,
  RatioShape,
} from '@agoric/ertp';
import {
  makeRecorderTopic,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/topics.js';
import { depositToSeat } from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import {
  depositCalc,
  makeParity,
  withdrawCalc,
  withFees,
} from '../pool-share-math.js';
import { makeProposalShapes } from '../type-guards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {TypedPattern} from '@agoric/internal'
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'
 * @import {USDCProposalShapes, ShareWorth} from '../pool-share-math.js'
 */

/**
 * @param {Zone} zone
 * @param {ZCF} zcf
 * @param {Brand<'nat'>} USDC
 * @param {{
 *   makeRecorderKit: MakeRecorderKit;
 * }} tools
 */
export const prepareLiquidityPoolKit = (zone, zcf, USDC, tools) => {
  return zone.exoClassKit(
    'Fast Liquidity Pool',
    {
      feeSink: M.interface('feeSink', {
        receive: M.call(AmountShape, PaymentShape).returns(M.promise()),
      }),
      external: M.interface('external', {
        publishShareWorth: M.call().returns(M.promise()),
      }),
      depositHandler: M.interface('depositHandler', {
        handle: M.call(SeatShape, M.any()).returns(M.promise()),
      }),
      withdrawHandler: M.interface('withdrawHandler', {
        handle: M.call(SeatShape, M.any()).returns(M.promise()),
      }),
      public: M.interface('public', {
        makeDepositInvitation: M.call().returns(M.promise()),
        makeWithdrawInvitation: M.call().returns(M.promise()),
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
    },
    /**
     * @param {ZCFMint<'nat'>} shareMint
     * @param {StorageNode} node
     */
    (shareMint, node) => {
      const { brand: PoolShares } = shareMint.getIssuerRecord();
      const proposalShapes = makeProposalShapes({ USDC, PoolShares });
      const dust = AmountMath.make(USDC, 1n);
      const shareWorth = makeParity(dust, PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      const shareWorthRecorderKit = tools.makeRecorderKit(
        node,
        /** @type {TypedPattern<Ratio>} */ (RatioShape),
      );
      return {
        shareMint,
        shareWorth,
        poolSeat,
        PoolShares,
        proposalShapes,
        shareWorthRecorderKit,
      };
    },
    {
      feeSink: {
        /**
         * @param {Amount<'nat'>} amount
         * @param {Payment<'nat'>} payment
         */
        async receive(amount, payment) {
          const { poolSeat, shareWorth } = this.state;
          const { external } = this.facets;
          await depositToSeat(
            zcf,
            poolSeat,
            harden({ USDC: amount }),
            harden({ USDC: payment }),
          );
          this.state.shareWorth = withFees(shareWorth, amount);
          await external.publishShareWorth();
        },
      },

      external: {
        async publishShareWorth() {
          const { shareWorth } = this.state;
          const { recorder } = this.state.shareWorthRecorderKit;
          await recorder.write(shareWorth);
        },
      },

      depositHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp) {
          const { shareWorth, shareMint, poolSeat } = this.state;
          const { external } = this.facets;

          /** @type {USDCProposalShapes['deposit']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          const post = depositCalc(shareWorth, proposal);

          // COMMIT POINT

          const mint = shareMint.mintGains(post.payouts);
          this.state.shareWorth = post.shareWorth;
          try {
            zcf.atomicRearrange(
              harden([
                // zoe guarantees lp has proposal.give allocated
                [lp, poolSeat, proposal.give],
                // mintGains() above establishes that mint has post.payouts
                [mint, lp, post.payouts],
              ]),
            );
            lp.exit();
            mint.exit();
          } catch (bug) {
            console.error('🚨 shutdown due to', bug);
            zcf.shutdownWithFailure(bug);
          }
          await external.publishShareWorth();
        },
      },
      withdrawHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp) {
          const { shareWorth, shareMint, poolSeat } = this.state;
          const { external } = this.facets;

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
          lp.exit();
          burn.exit();
          this.state.shareWorth = post.shareWorth;
          await external.publishShareWorth();
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
        getPublicTopics() {
          const { shareWorthRecorderKit } = this.state;
          return {
            shareWorth: makeRecorderTopic('shareWorth', shareWorthRecorderKit),
          };
        },
      },
    },
    {
      finish: ({ facets: { external } }) => {
        void external.publishShareWorth();
      },
    },
  );
};
harden(prepareLiquidityPoolKit);
