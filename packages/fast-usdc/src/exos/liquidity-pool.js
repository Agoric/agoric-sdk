import { AmountMath } from '@agoric/ertp';
import {
  makeRecorderTopic,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/topics.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import { M } from '@endo/patterns';
import { Fail, q } from '@endo/errors';
import {
  borrowCalc,
  depositCalc,
  makeParity,
  repayCalc,
  withdrawCalc,
} from '../pool-share-math.js';
import {
  makeNatAmountShape,
  makeProposalShapes,
  PoolMetricsShape,
} from '../type-guards.js';

/**
 * @import {Zone} from '@agoric/zone';
 * @import {Remote} from '@agoric/internal'
 * @import {StorageNode} from '@agoric/internal/src/lib-chainStorage.js'
 * @import {MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'
 * @import {USDCProposalShapes, ShareWorth} from '../pool-share-math.js'
 * @import {PoolStats} from '../types.js';
 */

const { add, isEqual, makeEmpty } = AmountMath;

/** @param {Brand} brand */
const makeDust = brand => AmountMath.make(brand, 1n);

/**
 * Verifies that the total pool balance (unencumbered + encumbered) matches the
 * shareWorth numerator. The total pool balance consists of:
 * 1. unencumbered balance - USDC available in the pool for borrowing
 * 2. encumbered balance - USDC currently lent out
 *
 * A negligible `dust` amount is used to initialize shareWorth with a non-zero
 * denominator. It must remain in the pool at all times.
 *
 * @param {ZCFSeat} poolSeat
 * @param {ShareWorth} shareWorth
 * @param {Brand} USDC
 * @param {Amount<'nat'>} encumberedBalance
 */
const checkPoolBalance = (poolSeat, shareWorth, USDC, encumberedBalance) => {
  const unencumberedBalance = poolSeat.getAmountAllocated('USDC', USDC);
  const dust = makeDust(USDC);
  const grossBalance = add(add(unencumberedBalance, dust), encumberedBalance);
  isEqual(grossBalance, shareWorth.numerator) ||
    Fail`🚨 pool balance ${q(unencumberedBalance)} and encumbered balance ${q(encumberedBalance)} inconsistent with shareWorth ${q(shareWorth)}`;
};

/**
 * @typedef {{
 *  Principal: Amount<'nat'>;
 *  PoolFee: Amount<'nat'>;
 *  ContractFee: Amount<'nat'>;
 * }} RepayAmountKWR
 */

/**
 * @typedef {{
 *  Principal: Payment<'nat'>;
 *  PoolFee: Payment<'nat'>;
 *  ContractFee: Payment<'nat'>;
 * }} RepayPaymentKWR
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
    'Liquidity Pool',
    {
      borrower: M.interface('borrower', {
        borrow: M.call(
          SeatShape,
          harden({ USDC: makeNatAmountShape(USDC, 1n) }),
        ).returns(),
      }),
      repayer: M.interface('repayer', {
        repay: M.call(
          SeatShape,
          harden({
            Principal: makeNatAmountShape(USDC, 1n),
            PoolFee: makeNatAmountShape(USDC, 0n),
            ContractFee: makeNatAmountShape(USDC, 0n),
          }),
        ).returns(),
      }),
      external: M.interface('external', {
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
      const proposalShapes = makeProposalShapes({ USDC, PoolShares });
      const shareWorth = makeParity(makeDust(USDC), PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      const { zcfSeat: feeSeat } = zcf.makeEmptySeatKit();
      const poolMetricsRecorderKit = tools.makeRecorderKit(
        node,
        PoolMetricsShape,
      );
      const encumberedBalance = makeEmpty(USDC);
      /** @type {PoolStats} */
      const poolStats = harden({
        totalBorrows: makeEmpty(USDC),
        totalContractFees: makeEmpty(USDC),
        totalPoolFees: makeEmpty(USDC),
        totalRepays: makeEmpty(USDC),
      });
      return {
        /** used for `checkPoolBalance` invariant. aka 'outstanding borrows' */
        encumberedBalance,
        feeSeat,
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
      borrower: {
        /**
         * @param {ZCFSeat} toSeat
         * @param {{ USDC: Amount<'nat'>}} amountKWR
         */
        borrow(toSeat, amountKWR) {
          const { encumberedBalance, poolSeat, poolStats } = this.state;

          // Validate amount is available in pool
          const post = borrowCalc(
            amountKWR.USDC,
            poolSeat.getAmountAllocated('USDC', USDC),
            encumberedBalance,
            poolStats,
          );

          // COMMIT POINT
          try {
            zcf.atomicRearrange(harden([[poolSeat, toSeat, amountKWR]]));
          } catch (cause) {
            const reason = Error('🚨 cannot commit borrow', { cause });
            console.error(reason.message, cause);
            zcf.shutdownWithFailure(reason);
          }

          Object.assign(this.state, post);
          this.facets.external.publishPoolMetrics();
        },
        // TODO method to repay failed `LOA.deposit()`
      },
      repayer: {
        /**
         * @param {ZCFSeat} fromSeat
         * @param {RepayAmountKWR} amounts
         */
        repay(fromSeat, amounts) {
          const {
            encumberedBalance,
            feeSeat,
            poolSeat,
            poolStats,
            shareWorth,
          } = this.state;
          checkPoolBalance(poolSeat, shareWorth, USDC, encumberedBalance);

          const fromSeatAllocation = fromSeat.getCurrentAllocation();
          // Validate allocation equals amounts and Principal <= encumberedBalance
          const post = repayCalc(
            shareWorth,
            fromSeatAllocation,
            amounts,
            encumberedBalance,
            poolStats,
          );

          const { ContractFee, ...rest } = amounts;

          // COMMIT POINT
          try {
            zcf.atomicRearrange(
              harden([
                [
                  fromSeat,
                  poolSeat,
                  rest,
                  { USDC: add(amounts.PoolFee, amounts.Principal) },
                ],
                [fromSeat, feeSeat, { ContractFee }, { USDC: ContractFee }],
              ]),
            );
          } catch (cause) {
            const reason = Error('🚨 cannot commit repay', { cause });
            console.error(reason.message, cause);
            zcf.shutdownWithFailure(reason);
          }

          Object.assign(this.state, post);
          this.facets.external.publishPoolMetrics();
        },
      },
      external: {
        publishPoolMetrics() {
          const { poolStats, shareWorth, encumberedBalance } = this.state;
          const { recorder } = this.state.poolMetricsRecorderKit;
          // Consumers of this .write() are off-chain / outside the VM.
          // And there's no way to recover from a failed write.
          // So don't await.
          void recorder.write({
            encumberedBalance,
            shareWorth,
            ...poolStats,
          });
        },
      },

      depositHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp) {
          const { shareWorth, shareMint, poolSeat, encumberedBalance } =
            this.state;
          const { external } = this.facets;

          /** @type {USDCProposalShapes['deposit']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          checkPoolBalance(poolSeat, shareWorth, USDC, encumberedBalance);
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
          const { shareWorth, shareMint, poolSeat, encumberedBalance } =
            this.state;
          const { external } = this.facets;

          /** @type {USDCProposalShapes['withdraw']} */
          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal();
          const { zcfSeat: burn } = zcf.makeEmptySeatKit();
          checkPoolBalance(poolSeat, shareWorth, USDC, encumberedBalance);
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

/**
 * @typedef {ReturnType<ReturnType<typeof prepareLiquidityPoolKit>>} LiquidityPoolKit
 */
