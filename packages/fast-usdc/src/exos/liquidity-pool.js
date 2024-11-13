import { AmountMath, AmountShape, PaymentShape } from '@agoric/ertp';
import {
  makeRecorderTopic,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/topics.js';
import {
  depositToSeat,
  withdrawFromSeat,
} from '@agoric/zoe/src/contractSupport/zoeHelpers.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { M } from '@endo/patterns';
import { Fail, q } from '@endo/errors';
import {
  depositCalc,
  makeParity,
  withdrawCalc,
  withFees,
} from '../pool-share-math.js';
import { makeProposalShapes } from '../type-guards.js';
import { PoolMetricsShape } from '../typeGuards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {Remote, TypedPattern} from '@agoric/internal'
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {MakeRecorderKit, RecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'
 * @import {USDCProposalShapes, ShareWorth} from '../pool-share-math.js'
 * @import {PoolMetrics, PoolStats} from '../types.js';
 */

const { add, isEqual } = AmountMath;

/** @param {Brand} brand */
const makeDust = brand => AmountMath.make(brand, 1n);

/**
 *
 * @param {ZCFSeat} poolSeat
 * @param {ShareWorth} shareWorth
 * @param {Brand} USDC
 * @param {Amount<'nat'>} outstandingLends
 */
const checkPoolBalance = (poolSeat, shareWorth, USDC, outstandingLends) => {
  const available = poolSeat.getAmountAllocated('USDC', USDC);
  const dust = makeDust(USDC);
  const virtualTotal = add(add(available, dust), outstandingLends);
  isEqual(virtualTotal, shareWorth.numerator) ||
    Fail`🚨 pool balance ${q(available)} inconsistent with shareWorth ${q(shareWorth)}`;
};

/**
 * @param {Zone} zone
 * @param {object} caps
 * @param {ZCF} caps.zcf
 * @param {{brand: Brand<'nat'>; issuer: Issuer<'nat'>;}} caps.USDC
 * @param {{
 *   makeRecorderKit: MakeRecorderKit;
 * }} caps.tools
 */
export const prepareLiquidityPoolKit = (zone, { zcf, USDC, tools }) => {
  return zone.exoClassKit(
    'Fast Liquidity Pool',
    {
      assetManager: M.interface('assetManager', {
        borrowUnderlying: M.callWhen(AmountShape).returns(PaymentShape),
        returnUnderlying: M.call(PaymentShape, PaymentShape).returns(
          M.promise(),
        ),
      }),
      external: M.interface('external', {
        publishShareWorth: M.call().returns(),
        publishPoolMetrics: M.call().returns(),
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
      const proposalShapes = makeProposalShapes({
        USDC: USDC.brand,
        PoolShares,
      });
      const shareWorth = makeParity(makeDust(USDC.brand), PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      const poolMetricsRecorderKit = tools.makeRecorderKit(
        node,
        PoolMetricsShape,
      );
      /** used for `checkPoolBalance` invariant 🤷‍♂️ */
      const outstandingLends = AmountMath.make(USDC.brand, 0n);
      const poolStats = /** @type {PoolStats} */ ({
        totalFees: AmountMath.make(USDC.brand, 0n),
        totalBorrows: AmountMath.make(USDC.brand, 0n),
        totalReturns: AmountMath.make(USDC.brand, 0n),
      });
      return {
        outstandingLends,
        poolStats,
        poolMetricsRecorderKit,
        poolSeat,
        PoolShares,
        proposalShapes,
        shareMint,
        shareWorth,
      };
    },
    {
      assetManager: {
        /**
         * @param {Amount<'nat'>} amount
         * @returns {Promise<PaymentPKeywordRecord>}
         */
        async borrowUnderlying(amount) {
          const { poolSeat } = this.state;
          // Validate amount is available in pool
          const available = poolSeat.getAmountAllocated('USDC', USDC.brand);
          AmountMath.isGTE(available, amount) ||
            Fail`Cannot borrow ${q(amount)}, only ${q(available)} available`;

          const payment = await withdrawFromSeat(zcf, poolSeat, {
            USDC: amount,
          });

          this.state.outstandingLends = AmountMath.add(
            this.state.outstandingLends,
            amount,
          );
          this.state.poolStats.totalBorrows = AmountMath.add(
            this.state.poolStats.totalBorrows,
            amount,
          );
          this.facets.external.publishPoolMetrics();
          return payment;
        },

        /**
         * @param {Payment<'nat'>} principalPayment
         * @param {Payment<'nat'>} feePayment
         */
        async returnUnderlying(principalPayment, feePayment) {
          const { poolSeat } = this.state;

          const [principalAmount, feeAmount] = await Promise.all([
            E(USDC.issuer).getAmountOf(principalPayment),
            E(USDC.issuer).getAmountOf(feePayment),
          ]);

          // Deposit principal
          await depositToSeat(
            zcf,
            poolSeat,
            harden({ USDC: principalAmount }),
            harden({ USDC: principalPayment }),
          );
          // Update outstanding lends
          this.state.outstandingLends = AmountMath.subtract(
            this.state.outstandingLends,
            principalAmount,
          );

          // XXX consider a single payment
          await depositToSeat(
            zcf,
            poolSeat,
            harden({ USDC: feeAmount }),
            harden({ USDC: feePayment }),
          );
          // Update share worth to include fees
          this.state.shareWorth = withFees(this.state.shareWorth, feeAmount);

          // Update metrics
          this.state.poolStats.totalReturns = AmountMath.add(
            this.state.poolStats.totalReturns,
            principalAmount,
          );
          this.state.poolStats.totalFees = AmountMath.add(
            this.state.poolStats.totalFees,
            feeAmount,
          );
          this.facets.external.publishPoolMetrics();
        },
      },

      external: {
        publishPoolMetrics() {
          const { poolStats, shareWorth, poolSeat } = this.state;
          const { recorder } = this.state.poolMetricsRecorderKit;
          // Consumers of this .write() are off-chain / outside the VM.
          // And there's no way to recover from a failed write.
          // So don't await.
          void recorder.write(
            /** @type {PoolMetrics} */ ({
              availableBalance: poolSeat.getAmountAllocated('USDC', USDC.brand),
              shareWorth,
              ...poolStats,
            }),
          );
        },
      },

      depositHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp) {
          const { shareWorth, shareMint, poolSeat, outstandingLends } =
            this.state;
          const { external } = this.facets;

          /** @type {USDCProposalShapes['deposit']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          checkPoolBalance(poolSeat, shareWorth, USDC.brand, outstandingLends);
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
          external.publishPoolMetrics();
        },
      },
      withdrawHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp) {
          const { shareWorth, shareMint, poolSeat, outstandingLends } =
            this.state;
          const { external } = this.facets;

          /** @type {USDCProposalShapes['withdraw']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          const { zcfSeat: burn } = zcf.makeEmptySeatKit();
          checkPoolBalance(poolSeat, shareWorth, USDC.brand, outstandingLends);
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
          external.publishPoolMetrics();
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
          const { poolMetricsRecorderKit } = this.state;
          return {
            poolMetrics: makeRecorderTopic(
              'poolMetrics',
              poolMetricsRecorderKit,
            ),
          };
        },
      },
    },
    {
      finish: ({ facets: { external } }) => {
        void external.publishPoolMetrics();
      },
    },
  );
};
harden(prepareLiquidityPoolKit);
