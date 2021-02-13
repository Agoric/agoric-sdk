import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';

const log = anylogger('block-manager');

const BEGIN_BLOCK = 'BEGIN_BLOCK';
const DELIVER_INBOUND = 'DELIVER_INBOUND';
const END_BLOCK = 'END_BLOCK';
const COMMIT_BLOCK = 'COMMIT_BLOCK';
const IBC_EVENT = 'IBC_EVENT';
const PLEASE_PROVISION = 'PLEASE_PROVISION';

export default function makeBlockManager({
  deliverInbound,
  doBridgeInbound,
  beginBlock,
  endBlock,
  flushChainSends,
  saveChainState,
  saveOutsideState,
  savedActions,
  savedHeight,
  verboseBlocks = false,
}) {
  let computedHeight = savedHeight;
  let runTime = 0;

  async function kernelPerformAction(action) {
    // TODO warner we could change this to run the kernel only during END_BLOCK
    const start = Date.now();
    function finish() {
      // log.error('Action', action.type, action.blockHeight, 'is done!');
      runTime += Date.now() - start;
    }

    // log.error('Performing action', action);
    let p;
    switch (action.type) {
      case BEGIN_BLOCK:
        p = beginBlock(action.blockHeight, action.blockTime);
        break;

      case DELIVER_INBOUND:
        p = deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          action.blockHeight,
          action.blockTime,
        );
        break;

      case IBC_EVENT: {
        p = doBridgeInbound('dibc', action);
        break;
      }

      case PLEASE_PROVISION: {
        p = doBridgeInbound('provision', action);
        break;
      }

      case END_BLOCK:
        p = endBlock(action.blockHeight, action.blockTime);
        break;

      default:
        assert.fail(X`${action.type} not recognized`);
    }
    p.then(finish, finish);
    return p;
  }

  let currentActions = [];
  let decohered;

  async function blockManager(action, savedChainSends) {
    if (decohered) {
      throw decohered;
    }

    // console.warn('FIGME: blockHeight', action.blockHeight, 'received', action.type)
    switch (action.type) {
      case COMMIT_BLOCK: {
        verboseBlocks && log.info('block', action.blockHeight, 'commit');
        if (action.blockHeight !== computedHeight) {
          throw Error(
            `Committed height ${action.blockHeight} does not match computed height ${computedHeight}`,
          );
        }
        flushChainSends(false);
        break;
      }

      case BEGIN_BLOCK: {
        verboseBlocks && log.info('block', action.blockHeight, 'begin');

        // Start a new block, or possibly replay the prior one.
        for (const a of currentActions) {
          // FIXME: This is a problem, apparently with Cosmos SDK.
          // Need to diagnose.
          if (a.blockHeight !== action.blockHeight) {
            log.debug(
              'Block',
              action.blockHeight,
              'begun with a leftover uncommitted action:',
              a.type,
            );
          }
        }
        currentActions = [];
        runTime = 0;
        currentActions.push(action);
        break;
      }

      case END_BLOCK: {
        currentActions.push(action);

        // eslint-disable-next-line no-use-before-define
        if (!deepEquals(currentActions, savedActions)) {
          // We only handle the trivial case.
          const restoreHeight = action.blockHeight - 1;
          // We can reset from 0 to anything, since that's what happens
          // when genesis.initial_height !== "0".
          if (computedHeight !== 0 && restoreHeight !== computedHeight) {
            // Keep throwing forever.
            decohered = Error(
              // TODO unimplemented
              `Unimplemented reset state from ${computedHeight} to ${restoreHeight}`,
            );
            throw decohered;
          }
        }

        if (computedHeight === action.blockHeight) {
          // We are reevaluating, so send exactly the same downcalls to the chain.
          //
          // This is necessary only after a restart when Tendermint is reevaluating the
          // block that was interrupted and not committed.
          //
          // We assert that the return values are identical, which allows us not
          // to resave our state.
          try {
            flushChainSends(true);
          } catch (e) {
            // Very bad!
            decohered = e;
            throw e;
          }
        } else {
          // And now we actually run the kernel down here, during END_BLOCK, but still
          // reentrancy-protected

          // Perform our queued actions.
          for (const a of currentActions) {
            // eslint-disable-next-line no-await-in-loop
            await kernelPerformAction(a);
          }

          // We write out our on-chain state as a number of chainSends.
          const start = Date.now();
          await saveChainState();
          const chainTime = Date.now() - start;

          // Advance our saved state variables.
          savedActions = currentActions;
          computedHeight = action.blockHeight;

          // Save the kernel's computed state so that we can recover if we ever
          // reset before Cosmos SDK commit.
          const start2 = Date.now();
          await saveOutsideState(computedHeight, savedActions, savedChainSends);
          savedHeight = computedHeight;

          const saveTime = Date.now() - start2;

          log.debug(
            `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
          );
        }

        currentActions = [];
        break;
      }

      default: {
        currentActions.push(action);
      }
    }
  }

  return blockManager;
}

// TODO: Put this somewhere else.
function deepEquals(a, b, already = new WeakSet()) {
  if (Object.is(a, b)) {
    return true;
  }

  // Must both be objects.
  if (Object(a) !== a || Object(b) !== b) {
    return false;
  }

  // That we haven't seen before.
  if (already.has(a) || already.has(b)) {
    return false;
  }
  already.add(a);
  already.add(b);

  // With the same prototype.
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
    return false;
  }

  // And deepEquals entries.
  const amap = new Map(Object.entries(a));
  for (const [key, bval] of Object.entries(b)) {
    if (!amap.has(key)) {
      return false;
    }
    if (!deepEquals(amap.get(key), bval, already)) {
      return false;
    }
    amap.delete(key);
  }

  // And no extra keys in b.
  if (amap.size > 0) {
    return false;
  }
  return true;
}
