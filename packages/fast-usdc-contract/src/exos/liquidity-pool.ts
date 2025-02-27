import type { Amount, Brand } from '@agoric/ertp';
import { AmountMath, AmountShape, RatioShape } from '@agoric/ertp';
import type { USDCProposalShapes } from '@agoric/fast-usdc/src/pool-share-math.js';
import {
  borrowCalc,
  checkPoolBalance,
  depositCalc,
  makeParity,
  repayCalc,
  withdrawCalc,
} from '@agoric/fast-usdc/src/pool-share-math.js';
import {
  makeNatAmountShape,
  makeProposalShapes,
  PoolMetricsShape,
} from '@agoric/fast-usdc/src/type-guards.js';
import type { PoolStats } from '@agoric/fast-usdc/src/types.js';
import type { RepayAmountKWR } from '@agoric/fast-usdc/src/utils/fees.js';
import type { Remote } from '@agoric/internal';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import { TransferPartShape } from '@agoric/zoe/src/contractSupport/atomicTransfer.js';
import {
  fromOnly,
  makeRecorderTopic,
  RecorderKitShape,
  toOnly,
  TopicsRecordShape,
} from '@agoric/zoe/src/contractSupport/index.js';
import type { MakeRecorderKit } from '@agoric/zoe/src/contractSupport/recorder.js';
import { SeatShape } from '@agoric/zoe/src/typeGuards.js';
import type { ZCF, ZCFMint, ZCFSeat } from '@agoric/zoe/src/zoeService/zoe.js';
import type { Zone } from '@agoric/zone';
import { Fail, q } from '@endo/errors';
import { M } from '@endo/patterns';

const { add, isGTE, makeEmpty } = AmountMath;

export const stateShape = harden({
  encumberedBalance: AmountShape,
  feeSeat: M.remotable(),
  poolStats: M.record(),
  poolMetricsRecorderKit: RecorderKitShape,
  poolSeat: M.remotable(),
  PoolShares: M.remotable(),
  proposalShapes: {
    deposit: M.pattern(),
    withdraw: M.pattern(),
    withdrawFees: M.pattern(),
  },
  shareMint: M.remotable(),
  shareWorth: RatioShape,
});

/**
 * @param {Zone} zone
 * @param {ZCF} zcf
 * @param {Brand<'nat'>} USDC
 * @param {{
 *   makeRecorderKit: MakeRecorderKit;
 * }} tools
 * @param tools.makeRecorderKit
 */
export const prepareLiquidityPoolKit = (
  zone: Zone,
  zcf: ZCF,
  USDC: Brand<'nat'>,
  tools: {
    makeRecorderKit: MakeRecorderKit;
  },
) => {
  return zone.exoClassKit(
    'Liquidity Pool',
    {
      borrower: M.interface('borrower', {
        borrow: M.call(SeatShape, makeNatAmountShape(USDC, 1n)).returns(),
        returnToPool: M.call(SeatShape, makeNatAmountShape(USDC, 1n)).returns(),
      }),
      repayer: M.interface('repayer', {
        repay: M.call(
          TransferPartShape,
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
      withdrawFeesHandler: M.interface('withdrawFeesHandler', {
        handle: M.call(SeatShape, M.any()).returns(M.promise()),
      }),
      public: M.interface('public', {
        makeDepositInvitation: M.call().returns(M.promise()),
        makeWithdrawInvitation: M.call().returns(M.promise()),
        getPublicTopics: M.call().returns(TopicsRecordShape),
      }),
      feeRecipient: M.interface('feeRecipient', {
        getContractFeeBalance: M.call().returns(AmountShape),
        makeWithdrawFeesInvitation: M.call().returns(M.promise()),
      }),
    },
    (shareMint: ZCFMint<'nat'>, node: Remote<StorageNode>) => {
      const { brand: PoolShares } = shareMint.getIssuerRecord();
      const proposalShapes = makeProposalShapes({ USDC, PoolShares });
      const shareWorth = makeParity(USDC, PoolShares);
      const { zcfSeat: poolSeat } = zcf.makeEmptySeatKit();
      const { zcfSeat: feeSeat } = zcf.makeEmptySeatKit();
      const poolMetricsRecorderKit = tools.makeRecorderKit(
        node,
        PoolMetricsShape,
      );
      const encumberedBalance = makeEmpty(USDC);
      const poolStats: PoolStats = harden({
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
        borrow(toSeat: ZCFSeat, amount: Amount<'nat'>) {
          const { encumberedBalance, poolSeat, poolStats } = this.state;

          // Validate amount is available in pool
          const post = borrowCalc(
            amount,
            poolSeat.getAmountAllocated('USDC', USDC),
            encumberedBalance,
            poolStats,
          );

          // COMMIT POINT
          // UNTIL #10684: ability to terminate an incarnation w/o terminating the contract
          zcf.atomicRearrange(harden([[poolSeat, toSeat, { USDC: amount }]]));

          Object.assign(this.state, post);
          this.facets.external.publishPoolMetrics();
        },
        /**
         * If something fails during advance, return funds to the pool.
         *
         * @param borrowSeat
         * @param amount
         */
        returnToPool(borrowSeat: ZCFSeat, amount: Amount<'nat'>) {
          const returnAmounts = harden({
            Principal: amount,
            PoolFee: makeEmpty(USDC),
            ContractFee: makeEmpty(USDC),
          });
          const borrowSeatAllocation = borrowSeat.getCurrentAllocation();
          isGTE(borrowSeatAllocation.USDC, amount) ||
            Fail`⚠️ borrowSeatAllocation ${q(borrowSeatAllocation)} less than amountKWR ${q(amount)}`;

          const transferSourcePart = fromOnly(borrowSeat, { USDC: amount });
          this.facets.repayer.repay(transferSourcePart, returnAmounts);
          borrowSeat.exit();
        },
      },
      repayer: {
        repay(sourceTransfer: any, split: RepayAmountKWR) {
          const {
            encumberedBalance,
            feeSeat,
            poolSeat,
            poolStats,
            shareWorth,
          } = this.state;
          checkPoolBalance(
            poolSeat.getCurrentAllocation(),
            shareWorth,
            encumberedBalance,
          );
          // Validate Principal <= encumberedBalance and produce poolStats after
          const post = repayCalc(
            shareWorth,
            split,
            encumberedBalance,
            poolStats,
          );

          // COMMIT POINT
          // UNTIL #10684: ability to terminate an incarnation w/o terminating the contract
          zcf.atomicRearrange(
            harden([
              sourceTransfer,
              toOnly(poolSeat, { USDC: add(split.PoolFee, split.Principal) }),
              toOnly(feeSeat, { USDC: split.ContractFee }),
            ]),
          );

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
        async handle(lpSeat: ZCFSeat) {
          const { shareWorth, shareMint, poolSeat, encumberedBalance } =
            this.state;
          const { external } = this.facets;

          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal() as USDCProposalShapes['deposit'];
          checkPoolBalance(
            poolSeat.getCurrentAllocation(),
            shareWorth,
            encumberedBalance,
          );
          const post = depositCalc(shareWorth, proposal);

          // COMMIT POINT
          const sharePayoutSeat = shareMint.mintGains(post.payouts);
          try {
            this.state.shareWorth = post.shareWorth;
            zcf.atomicRearrange(
              harden([
                // zoe guarantees lpSeat has proposal.give allocated
                [lpSeat, poolSeat, proposal.give],
                // mintGains() above establishes that sharePayoutSeat has post.payouts
                [sharePayoutSeat, lpSeat, post.payouts],
              ]),
            );
          } catch (cause) {
            // UNTIL #10684: ability to terminate an incarnation w/o terminating the contract
            throw new Error('🚨 cannot commit deposit', { cause });
          } finally {
            lpSeat.exit();
            sharePayoutSeat.exit();
          }
          external.publishPoolMetrics();
        },
      },
      withdrawHandler: {
        /** @param {ZCFSeat} lp */
        async handle(lp: ZCFSeat) {
          const { shareWorth, shareMint, poolSeat, encumberedBalance } =
            this.state;
          const { external } = this.facets;

          // @ts-expect-error ensured by proposalShape
          const proposal = lp.getProposal() as USDCProposalShapes['withdraw'];
          const { zcfSeat: burn } = zcf.makeEmptySeatKit();
          const post = withdrawCalc(
            shareWorth,
            proposal,
            poolSeat.getCurrentAllocation(),
            encumberedBalance,
          );

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
          } catch (cause) {
            // UNTIL #10684: ability to terminate an incarnation w/o terminating the contract
            throw new Error('🚨 cannot commit withdraw', { cause });
          } finally {
            lp.exit();
            burn.exit();
          }
          external.publishPoolMetrics();
        },
      },
      withdrawFeesHandler: {
        async handle(seat: ZCFSeat) {
          const { feeSeat } = this.state;

          const { want } = seat.getProposal();
          const available = feeSeat.getAmountAllocated('USDC', want.USDC.brand);
          isGTE(available, want.USDC) ||
            Fail`cannot withdraw ${want.USDC}; only ${available} available`;

          // COMMIT POINT
          zcf.atomicRearrange(harden([[feeSeat, seat, want]]));
          seat.exit();
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
      feeRecipient: {
        getContractFeeBalance(): Amount<'nat'> {
          const { feeSeat } = this.state;
          return feeSeat.getCurrentAllocation().USDC as Amount<'nat'>;
        },
        makeWithdrawFeesInvitation() {
          return zcf.makeInvitation(
            this.facets.withdrawFeesHandler,
            'Withdraw Fees',
            undefined,
            this.state.proposalShapes.withdrawFees,
          );
        },
      },
    },
    {
      finish: ({ facets: { external } }) => {
        void external.publishPoolMetrics();
      },
      stateShape,
    },
  );
};
harden(prepareLiquidityPoolKit);

export type LiquidityPoolKit = ReturnType<
  ReturnType<typeof prepareLiquidityPoolKit>
>;
