import { type Amount, type NatAmount, type NatValue } from '@agoric/ertp';
import { NonNullish } from '@agoric/internal';
import type {
  AccountId,
  DenomAmount,
  OrchestrationAccount,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import { Fail, q } from '@endo/errors';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import type { PortfolioKit, Position } from './portfolio.exo.ts';
import {
  makeSwapLockMessages,
  makeUnlockSwapMessages,
  trace,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import {
  seatKeywords,
  type AssetPlaceRef,
  type LocalAccount,
  type MovementDesc,
  type NobleAccount,
  type SeatKeyword,
} from './type-guards.ts';
import { keyEQ } from '@endo/patterns';
import {
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
} from '@agoric/ertp/src/ratio.js';
import type { SupportedChain } from './constants.js';

type AssetPlace =
  | { pos: Position }
  | { accountOn: SupportedChain }
  | { seat: ZCFSeat; keyword: SeatKeyword };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return `position${place.pos.getPositionId()}`;
  if ('accountOn' in place) return `${place.accountOn}.makeAccount()`;
  return `seat:${place.keyword}`;
};

export type AssetMovement = {
  how: keyof AnimationMove;
  amount: Amount<'nat'>;
  src: AssetPlace;
  dest: AssetPlace;
  // XXX rename apply/recover to deposit/withdraw?
  apply: () => Promise<void>;
  recover: () => Promise<void>;
};
export type AssetMovementNobleSwap = AssetMovement & { usdnOut: NatValue };

const moveStatus = ({ how, src, dest, amount }: AssetMovement) => ({
  how,
  src: placeLabel(src),
  dest: placeLabel(dest),
  amount,
});

const errmsg = (err: any) => ('message' in err ? err.message : `${err}`);

const flip = (fwd: AssetMovement) => {
  const { src, dest, apply, recover } = fwd;
  return { ...fwd, src: dest, dest: src, apply: recover, recover: apply };
};

export const maybeFlip = (needed: boolean, move: AssetMovement) =>
  needed ? flip(move) : move;

export const trackFlow = async (
  reporter: GuestInterface<PortfolioKit['reporter']>,
  moves: AssetMovement[],
) => {
  const flowId = reporter.allocateFlowId();
  let step = 1;
  try {
    for (const move of moves) {
      trace(step, moveStatus(move));
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move) });
      await move.apply();
      const { amount, src, dest } = move;
      if ('pos' in src) {
        src.pos.recordTransferOut(amount);
      }
      if ('pos' in dest) {
        dest.pos.recordTransferIn(amount);
      }
      step += 1;
    }
    // TODO: delete the flow storage node
    // reporter.publishFlowStatus(flowId, { complete: true });
  } catch (err) {
    console.error('⚠️ step', step, ' failed', err);
    const failure = moves[step - 1];
    const errStep = step;
    while (step > 1) {
      step -= 1;
      const move = moves[step - 1];
      const how = `unwind: ${move.how}`;
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move), how });
      try {
        await move.recover();
      } catch (err) {
        console.error('⚠️ unwind step', step, ' failed', err);
        // if a recover fails, we just give up and report `where` the assets are
        const { dest: where, ...ms } = moveStatus(move);
        const final = { step, ...ms, how, where, error: errmsg(err) };
        reporter.publishFlowStatus(flowId, final);
        throw err;
      }
    }
    reporter.publishFlowStatus(flowId, {
      step: errStep,
      ...moveStatus(failure),
      error: errmsg(err),
    });
    throw err;
  }
};

type AnimationMove = {
  localTransfer: AssetMovement & {
    src: { seat: ZCFSeat; keyword: string };
    dest: { account: LocalAccount };
  };
  withdrawToSeat: AssetMovement & {
    src: { account: LocalAccount };
    dest: { seat: ZCFSeat; keyword: string };
  };
  transfer: AssetMovement & {
    src: { account: OrchestrationAccount<any> };
    dest: { account: OrchestrationAccount<any> };
  };
  USDN: AssetMovementNobleSwap & {
    src: { account: NobleAccount };
    dest: { pos: Position };
  };
  Aave: AssetMovement; // TODO
  Compound: AssetMovement; // TODO
};

type HowToMove = {
  [How in keyof AnimationMove]: {
    apply: (move: AnimationMove[How]) => Promise<void>;
    recover: (move: AnimationMove[How]) => Promise<void>;
  };
};

export const interpretFlowDesc = (
  flowDesc: MovementDesc[],
  kit: PortfolioKit,
  seat: ZCFSeat,
) => {
  const { reader } = kit;
  const toPlace = (ref: AssetPlaceRef): AssetPlace => {
    switch (typeof ref) {
      case 'number':
        return { pos: reader.getPosition(ref) };
      case 'string':
        if ((seatKeywords as string[]).includes(ref)) {
          return { seat, keyword: ref as SeatKeyword };
        }
        const account = reader.getAccount(
          ref as AccountId,
        ) as unknown as OrchestrationAccount<any>; // XXX Host/Guest types
        return { account };
      default:
        throw Error('unreachable');
    }
  };

  const moves: Omit<AssetMovement, 'apply' | 'recover'>[] = [];

  // Check all the rules before running any of them
  // XXX we do make (provide) accounts here, though, and that's not tracked in vstorage
  for (const moveDesc of flowDesc) {
    const src = toPlace(moveDesc.src);
    const { dest: destDef } = moveDesc;
    const isOpen = typeof destDef === 'object' && 'open' in destDef;
    const { amount } = moveDesc;

    if (isOpen) {
      if (!('account' in src))
        throw Fail`source for new position must be account ${q(moveDesc)}}`;
      const { open: protocol } = destDef;
      let pos: Position;
      const { manager } = kit;
      switch (protocol) {
        case 'USDN':
          pos = manager.provideUSDNPosition();
          break;
        case 'Aave':
        case 'Compound':
          const { chainId } = destDef;
          if (!chainId) throw Fail`chainId required ${q(moveDesc)}`;
          ({ position: pos } = manager.provideGMPPositionOn(protocol, chainId));
        default:
          throw Fail`no such protocol ${q(moveDesc)}`;
      }
      moves.push({ how: protocol, src, dest: { pos }, amount });
    } else {
      const dest = toPlace(destDef);
      if ('seat' in src) {
        'account' in dest ||
          Fail`src seat must have dest account ${q(moveDesc)}`;
        moves.push({ how: 'localTransfer', src, dest, amount });
      } else if ('account' in src) {
        if ('seat' in dest) {
          moves.push({ how: 'withdrawToSeat', src, dest, amount });
        } else if ('account' in dest) {
          moves.push({ how: 'transfer', src, dest, amount });
        } else if ('pos' in dest) {
          moves.push({ how: dest.pos.getYieldProtocol(), src, dest, amount });
        } else {
          throw Error('unreachable');
        }
      }
    }
  }
  return moves;
};

const addMoveBehavior = async (
  moveData: Omit<AssetMovement, 'apply' | 'recover'>[],
  ctx: Pick<PortfolioInstanceContext, 'zoeTools' | 'chainHubTools'>,
) => {
  const { zoeTools } = ctx;
  const toD = (a: NatAmount): DenomAmount =>
    harden({ ...a, denom: NonNullish(ctx.chainHubTools.getDenom(a.brand)) });

  const animate: HowToMove = {
    localTransfer: {
      // XXX rename apply, recover to deposit, withdraw?
      apply: async move =>
        zoeTools.localTransfer(move.src.seat, move.dest.account, {
          Deposit: move.amount,
        }),
      recover: async move =>
        zoeTools.withdrawToSeat(move.dest.account, move.src.seat, {
          Cash: move.amount,
        }),
    },
    withdrawToSeat: {
      apply: async move =>
        zoeTools.withdrawToSeat(move.src.account, move.dest.seat, {
          Cash: move.amount,
        }),
      recover: async move =>
        zoeTools.localTransfer(move.dest.seat, move.src.account, {
          Deposit: move.amount,
        }),
    },
    transfer: {
      apply: move =>
        move.src.account.transfer(
          move.dest.account.getAddress(),
          toD(move.amount),
        ),
      recover: move =>
        move.dest.account.transfer(
          move.src.account.getAddress(),
          toD(move.amount),
        ),
    },
    // XXX move USDN stuff to its own file
    USDN: {
      apply: async move => {
        const { account: ica } = move.src;
        const address = ica.getAddress();
        const { usdnOut } = move;
        const { msgSwap, msgLock, protoMessages } = makeSwapLockMessages(
          address,
          move.amount.value,
          { usdnOut },
        );
        trace('executing', [msgSwap, msgLock].filter(Boolean));
        const result = await ica.executeEncodedTx(protoMessages);
        trace('TODO: decode Swap, Lock result; detect errors', result);
      },
      recover: async move => {
        const { account: ica } = move.src;
        const address = ica.getAddress();
        const { usdnOut } = move;
        const { msgUnlock, msgSwap, protoMessages } = makeUnlockSwapMessages(
          address,
          move.amount.value,
          { usdnOut },
        );
        trace('executing', [msgUnlock, msgSwap].filter(Boolean));
        const result = await ica.executeEncodedTx(protoMessages);
        trace('TODO: decode Swap, Lock result; detect errors', result);
      },
    },
    Aave: {
      apply: _m => assert.fail('TODO'),
      recover: _m => assert.fail('TODO'),
    },
    Compound: {
      apply: _m => assert.fail('TODO'),
      recover: _m => assert.fail('TODO'),
    },
  };

  const moves: AssetMovement[] = moveData.map(m => {
    const { how } = m;
    const { apply, recover } = animate[how];
    return { ...m, apply, recover } as AssetMovement;
  });

  return harden(moves);
};

export const applyProRataStrategyTo = (
  amount: NatAmount,
  prev: MovementDesc[],
  start: AssetPlaceRef,
) => {
  const startIx = prev.findIndex(move => keyEQ(move.src, start));
  const startMove = prev[startIx];
  console.log({ startIx, startMove });
  return prev.slice(startIx).map(move => ({
    ...move,
    amount: multiplyBy(
      amount,
      makeRatioFromAmounts(move.amount, startMove.amount),
    ),
  }));
};
