// @ts-check
import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';
import * as ActionType from './action-types.js';

import '@agoric/notifier/exported.js';

const console = anylogger('block-manager');

/** @typedef {Record<string, unknown>} InstallationNotification */

export default function makeBlockManager({
  actionQueue,
  performAction,
  replayChainSends,
  saveChainState,
  saveOutsideState,
  savedHeight,
  verboseBlocks = false,
}) {
  let computedHeight = savedHeight;
  let runTime = 0;
  let chainTime;
  let beginBlockAction;

  async function processAction(action) {
    const start = Date.now();
    const finish = res => {
      // console.error('Action', action.type, action.blockHeight, 'is done!');
      runTime += Date.now() - start;
      return res;
    };

    const p = performAction(action);
    // Just attach some callbacks, but don't use the resulting neutered result
    // promise.
    p.then(finish, e => {
      // None of these must fail, and if they do, log them verbosely before
      // returning to the chain.
      console.error(action.type, 'error:', e);
      finish();
    });
    // Return the original promise so that the caller gets the original
    // resolution or rejection.
    return p;
  }

  let decohered;

  async function blockingSend(action) {
    if (decohered) {
      throw decohered;
    }

    // console.warn('FIGME: blockHeight', action.blockHeight, 'received', action.type)
    switch (action.type) {
      case ActionType.BOOTSTRAP_BLOCK: {
        // This only runs for the very first block on the chain.
        verboseBlocks && console.info('block bootstrap');
        if (computedHeight !== 0) {
          throw Error(
            `Cannot run a bootstrap block at height ${action.blockHeight}`,
          );
        }
        await processAction(action);
        break;
      }

      case ActionType.COMMIT_BLOCK: {
        verboseBlocks && console.info('block', action.blockHeight, 'commit');
        if (action.blockHeight !== computedHeight) {
          throw Error(
            `Committed height ${action.blockHeight} does not match computed height ${computedHeight}`,
          );
        }

        // Save the kernel's computed state just before the chain commits.
        const start2 = Date.now();
        await saveOutsideState(computedHeight, action.blockTime);

        const saveTime = Date.now() - start2;

        console.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        break;
      }

      case ActionType.BEGIN_BLOCK: {
        verboseBlocks && console.info('block', action.blockHeight, 'begin');
        runTime = 0;
        beginBlockAction = action;
        break;
      }

      case ActionType.END_BLOCK: {
        // eslint-disable-next-line no-use-before-define
        if (computedHeight > 0 && computedHeight !== action.blockHeight) {
          // We only tolerate the trivial case.
          const restoreHeight = action.blockHeight - 1;
          if (restoreHeight !== computedHeight) {
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
          // We assert that the return values are identical, which allows us to silently
          // clear the queue.
          for (const _ of actionQueue.consumeAll());
          try {
            replayChainSends();
          } catch (e) {
            // Very bad!
            decohered = e;
            throw e;
          }
        } else {
          // And now we actually process the queued actions down here, during
          // END_BLOCK, but still reentrancy-protected

          // Process our begin, queued actions, and end.
          await processAction(beginBlockAction); // BEGIN_BLOCK
          for (const a of actionQueue.consumeAll()) {
            // eslint-disable-next-line no-await-in-loop
            await processAction(a);
          }
          await processAction(action); // END_BLOCK

          // We write out our on-chain state as a number of chainSends.
          const start = Date.now();
          await saveChainState();
          chainTime = Date.now() - start;

          // Advance our saved state variables.
          beginBlockAction = undefined;
          computedHeight = action.blockHeight;
        }

        break;
      }

      default: {
        assert.fail(
          X`Unrecognized action ${action}; are you sure you didn't mean to queue it?`,
        );
      }
    }
  }

  return blockingSend;
}
