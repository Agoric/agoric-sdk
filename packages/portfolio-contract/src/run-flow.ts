import type { Amount } from '@agoric/ertp';
import type { AccountId, OrchestrationAccount } from '@agoric/orchestration';
import { coerceAccountId } from '@agoric/orchestration/src/utils/address.js';
import type { ZCFSeat } from '@agoric/zoe';
import type { GuestInterface } from '../../async-flow/src/types.ts';
import type { Position, PortfolioKit } from './portfolio.exo.ts';
import { trace } from './portfolio.flows.ts';
import {
  seatKeywords,
  type AssetPlaceRef,
  type MovementDesc,
} from './type-guards.ts';
import { Fail, q } from '@endo/errors';

/* c8 ignore end */
type AssetPlace =
  | { pos: Position }
  | { account: OrchestrationAccount<any> }
  | { seat: ZCFSeat; keyword: string };

const placeLabel = (place: AssetPlace) => {
  if ('pos' in place) return `position${place.pos.getPositionId()}`;
  if ('account' in place) return coerceAccountId(place.account.getAddress());
  return `seat:${place.keyword}`;
};

export type AssetMovement = {
  how: string;
  amount: Amount<'nat'>;
  src: AssetPlace;
  dest: AssetPlace;
  apply: () => Promise<void>;
  recover: () => Promise<void>;
};

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
        if (seatKeywords.includes(ref)) {
          return { seat, keyword: ref };
        }
        const account = reader.getAccount(
          ref as AccountId,
        ) as unknown as OrchestrationAccount<any>; // Host/Guest
        return { account };
      default:
        throw Error('unreadable');
    }
  };
  const moves: Omit<AssetMovement, 'apply' | 'recover'>[] = [];

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
  return harden(moves);
};
