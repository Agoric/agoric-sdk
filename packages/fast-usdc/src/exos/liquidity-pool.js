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
import { Fail, q } from '@endo/errors';
import {
  depositCalc,
  makeParity,
  withdrawCalc,
  withFees,
} from '../pool-share-math.js';
import { makeProposalShapes } from '../type-guards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {Remote, TypedPattern} from '@agoric/internal'
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {MakeRecorderKit, RecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'
 * @import {USDCProposalShapes, ShareWorth} from '../pool-share-math.js'
 */

const { add, isEqual } = AmountMath;

/** @param {Brand} brand */
const makeDust = brand => AmountMath.make(brand, 1n);

/**
 * Use of pool-share-math in offer handlers below assumes that
 * the pool balance represented by the USDC allocation in poolSeat
 * is the same as the pool balance represented by the numerator
 * of shareWorth.
 *
 * Well, almost: they're the same modulo the dust used
 * to initialize shareWorth with a non-zero denominator.
 *
 * @param {ZCFSeat} poolSeat
 * @param {ShareWorth} shareWorth
 * @param {Brand} USDC
 */
const checkPoolBalance = (poolSeat, shareWorth, USDC) => {
  const available = poolSeat.getAmountAllocated('USDC', USDC);
  const dust = makeDust(USDC);
  isEqual(add(available, dust), shareWorth.numerator) ||
    Fail`🚨 pool balance ${q(available)} inconsistent with shareWorth ${q(shareWorth)}`;
};

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
    'Liquidity Pool',
    {
      feeSink: M.interface('feeSink', {
        receive: M.call(AmountShape, PaymentShape).returns(M.promise()),
      }),
      external: M.interface('external', {
        publishShareWorth: M.call().returns(),
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
     * @param {Remote<StorageNode>} node
     */
    (shareMint, node) => {
      const { brand: PoolShares } = shareMint.getIssuerRecord();
      const proposalShapes = makeProposalShapes({ USDC, PoolShares });
      const shareWorth = makeParity(makeDust(USDC), PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      const shareWorthRecorderKit = tools.makeRecorderKit(node, RatioShape);
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
          external.publishShareWorth();
        },
      },

      external: {
        publishShareWorth() {
          const { shareWorth } = this.state;
          const { recorder } = this.state.shareWorthRecorderKit;
          // Consumers of this .write() are off-chain / outside the VM.
          // And there's no way to recover from a failed write.
          // So don't await.
          void recorder.write(shareWorth);
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
          checkPoolBalance(poolSeat, shareWorth, USDC);
          const post = depositCalc(shareWorth, proposal);

          // COMMIT POINT

          try {
            const mint = shareMint.mintGains(post.payouts);
            this.state.shareWorth = post.shareWorth;
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
          } catch (cause) {
            const reason = Error('🚨 cannot commit deposit', { cause });
            console.error(reason.message, cause);
            zcf.shutdownWithFailure(reason);
          }
          external.publishShareWorth();
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
          checkPoolBalance(poolSeat, shareWorth, USDC);
          const post = withdrawCalc(shareWorth, proposal);

          // COMMIT POINT

          try {
            this.state.shareWorth = post.shareWorth;
            zcf.atomicRearrange(
              harden([
                // zoe guarantees lp has proposal.give allocated
                [lp, burn, proposal.give],
                // checkPoolBalance() + withdrawCalc() guarantee poolSeat has enough
                [poolSeat, lp, post.payouts],
              ]),
            );
            shareMint.burnLosses(proposal.give, burn);
            lp.exit();
            burn.exit();
          } catch (cause) {
            const reason = Error('🚨 cannot commit withdraw', { cause });
            console.error(reason.message, cause);
            zcf.shutdownWithFailure(reason);
          }
          external.publishShareWorth();
        },
      },
      public: {
        makeDepositInvitation() {
          return zcf.makeInvitation(
            this.facets.depositHandler,
            'Deposit',
            undefined,
            this.state.proposalShapes.deposit,
          );
        },
        makeWithdrawInvitation() {
          return zcf.makeInvitation(
            this.facets.withdrawHandler,
            'Withdraw',
            undefined,
            this.state.proposalShapes.withdraw,
          );
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
