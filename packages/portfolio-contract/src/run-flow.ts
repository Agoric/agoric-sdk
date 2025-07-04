import { type Amount, type NatAmount, type NatValue } from '@agoric/ertp';
import { NonNullish } from '@agoric/internal';
import type {
  AccountId,
  Denom,
  DenomAmount,
  OrchestrationAccount,
  Orchestrator,
} from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import { Fail, q } from '@endo/errors';
import type { Guest, GuestInterface } from '../../async-flow/src/types.ts';
import type {
  AccountInfoFor,
  PortfolioKit,
  Position,
} from './portfolio.exo.ts';
import {
  makeSwapLockMessages,
  makeUnlockSwapMessages,
  provideAccountInfo,
  trace,
  type PortfolioInstanceContext,
} from './portfolio.flows.ts';
import {
  getChainNameOfPlaceRef,
  PoolPlaces,
  seatKeywords,
  type AssetPlaceDef,
  type AssetPlaceRef,
  type LocalAccount,
  type MovementDesc,
  type NobleAccount,
  type PoolKey,
  type SeatKeyword,
} from './type-guards.ts';
import { keyEQ } from '@endo/patterns';
import {
  makeRatio,
  makeRatioFromAmounts,
  multiplyBy,
} from '@agoric/ertp/src/ratio.js';
import { SupportedChain } from './constants.js';
import type { ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';

type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<{ namespace: 'cosmos' }> }
  // TODO:  | { evmStuff: ? }
  | { seat: ZCFSeat; keyword: SeatKeyword };

const getAssetPlaceDefKind = (
  ref: AssetPlaceDef,
): 'pos' | 'accountId' | 'seat' => {
  switch (typeof ref) {
    case 'number':
      return 'pos';
    case 'object':
      return 'pos';
    case 'string':
      if ((seatKeywords as string[]).includes(ref)) return 'seat';
      if (getChainNameOfPlaceRef(ref)) return 'accountId';
    default:
      throw Fail`bad ref: ${ref}`;
  }
};

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return `position${place.pos.getPositionId()}`;
  if ('account' in place) return coerceAccountId(place.account.getAddress());
  return `seat:${place.keyword}`;
};

export type AssetMovement = {
  how: keyof AnimationMove;
  amount: Amount<'nat'>;
  src: AssetPlace;
  dest: AssetPlace;
  // XXX rename apply/recover to deposit/withdraw?
  apply: (move: any) => Promise<void>;
  recover: (move: any) => Promise<void>;
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
      await move.apply(move);
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
        await move.recover(move);
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

const trackFlowCHECKME = async (
  reporter: Guest<PortfolioKit['reporter']>,
  moves: AssetMovement[],
) => {
  const flowId = reporter.allocateFlowId();
  let step = 1;
  try {
    for (const move of moves) {
      trace(step, moveStatus(move));
      reporter.publishFlowStatus(flowId, { step, ...moveStatus(move) });
      await move.apply(move);
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
        await move.recover(move);
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

export const wayFromSrcToDesc = (
  moveDesc: MovementDesc,
  reader: PortfolioKit['reader'],
): keyof AnimationMove => {
  const { src } = moveDesc;
  const { dest: destDef } = moveDesc;
  const isOpen = typeof destDef === 'object' && 'open' in destDef;

  if (isOpen) {
    getChainNameOfPlaceRef(src) ||
      Fail`source for new position must be account ${q(moveDesc)}}`;
    return PoolPlaces[destDef.open].protocol;
  } else {
    const srcKind = getAssetPlaceDefKind(src);
    switch (srcKind) {
      case 'pos': {
        getAssetPlaceDefKind(destDef) === 'accountId' ||
          Fail`src pos must have account as dest ${q(moveDesc)}`;
        const pos = reader.getPosition(destDef as number);
        return pos.getYieldProtocol();
        break;
      }

      case 'seat':
        getAssetPlaceDefKind(destDef) === 'accountId' ||
          Fail`src seat must have account as dest ${q(moveDesc)}`;
        return 'localTransfer';
        break;

      case 'accountId': {
        const destKind = getAssetPlaceDefKind(destDef);
        switch (destKind) {
          case 'seat':
            return 'withdrawToSeat';
            break;
          case 'accountId':
            return 'transfer';
            break;
          case 'pos': {
            const pos = reader.getPosition(destDef as number);
            return pos.getYieldProtocol();
            break;
          }
          default:
            throw Fail`unreachable:${destKind}`;
        }
        break;
      }
      default:
        throw Fail`unreachable: ${srcKind}`;
    }
  }
};

export const interpretFlowDesc = async (
  orch: Orchestrator,
  flowDesc: MovementDesc[],
  zoeTools: PortfolioInstanceContext['zoeTools'],
  seat: ZCFSeat,
  kit: Guest<PortfolioKit>,
  denom: Denom,
): Promise<AssetMovement[]> => {
  const toD = (a: NatAmount): DenomAmount => harden({ ...a, denom });

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

  const { reader } = kit;

  const toPlace = async (ref: AssetPlaceRef): Promise<AssetPlace> => {
    switch (typeof ref) {
      case 'number':
        return { pos: reader.getPosition(ref) }; // XXX what if get throws?
      case 'string':
        if ((seatKeywords as string[]).includes(ref)) {
          return { seat, keyword: ref as SeatKeyword };
        }
        const chain = getChainNameOfPlaceRef(ref);
        assert(chain, `bad ref: ${ref}`);
        const info = (await provideAccountInfo(
          orch,
          chain,
          kit,
        )) as AccountInfoFor[typeof chain];
        switch (info.type) {
          case 'agoric':
            return { account: info.lca };
          case 'noble':
            return { account: info.ica };
          default:
            throw Error('NOT IMPL');
        }
      default:
        throw Fail`unreachable: ${q(ref)}`;
    }
  };

  const makePositionPlace = async (
    desc: AssetPlaceDef & { open: PoolKey },
  ): Promise<AssetPlace> => {
    const { open: poolKey } = desc;
    const info = PoolPlaces[poolKey];
    switch (info.protocol) {
      case 'USDN': {
        const { ica } = await provideAccountInfo(orch, 'noble', kit);
        const pos = kit.manager.provideUSDNPosition(
          coerceAccountId(ica.getAddress()),
        );
        return { pos };
      }
      default:
        throw Fail`not implemented: ${q(desc)}`;
    }
  };

  const movesWithPlaces: AssetMovement[] = [];

  let ix = 0;
  for (const moveDesc of flowDesc) {
    const how = wayFromSrcToDesc(moveDesc, kit.reader);
    const { apply, recover } = animate[how];
    const { amount } = moveDesc;
    const src = await toPlace(moveDesc.src);
    const { dest: destDesc } = moveDesc;
    const dest = await (() => {
      if (typeof destDesc === 'object' && 'open' in destDesc) {
        return makePositionPlace(destDesc);
      } else {
        return toPlace(destDesc);
      }
    })();
    const move: AssetMovement = {
      how,
      amount,
      src,
      dest,
      apply,
      recover,
    };
    ix += 1;
    movesWithPlaces.push(move);
  }

  return harden(movesWithPlaces);
};
