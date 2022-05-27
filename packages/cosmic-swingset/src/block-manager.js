// @ts-check
/* global process */
import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';

import * as BRIDGE_ID from '@agoric/vats/src/bridge-ids.js';

import * as ActionType from './action-types.js';
import { parseParams } from './params.js';

const console = anylogger('block-manager');

// Artificially create load if set.
const END_BLOCK_SPIN_MS = process.env.END_BLOCK_SPIN_MS
  ? parseInt(process.env.END_BLOCK_SPIN_MS, 10)
  : 0;

export default function makeBlockManager({
  actionQueue,
  deliverInbound,
  doBridgeInbound,
  bootstrapBlock,
  beginBlock,
  endBlock,
  flushChainSends,
  saveChainState,
  saveOutsideState,
  savedHeight,
  validateAndInstallBundle,
  verboseBlocks = false,
}) {
  let computedHeight = savedHeight;
  let runTime = 0;
  let chainTime;
  let latestParams;
  let beginBlockAction;

  async function processAction(action) {
    const start = Date.now();
    const finish = res => {
      // console.error('Action', action.type, action.blockHeight, 'is done!');
      runTime += Date.now() - start;
      return res;
    };

    // console.error('Performing action', action);
    let p;
    switch (action.type) {
      case ActionType.BEGIN_BLOCK: {
        latestParams = parseParams(action.params);
        p = beginBlock(action.blockHeight, action.blockTime, latestParams);
        break;
      }

      case ActionType.DELIVER_INBOUND: {
        p = deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          action.blockHeight,
          action.blockTime,
          latestParams,
        );
        break;
      }

      case ActionType.VBANK_BALANCE_UPDATE: {
        p = doBridgeInbound(BRIDGE_ID.BANK, action);
        break;
      }

      case ActionType.IBC_EVENT: {
        p = doBridgeInbound(BRIDGE_ID.DIBC, action);
        break;
      }

      case ActionType.PLEASE_PROVISION: {
        p = doBridgeInbound(BRIDGE_ID.PROVISION, action);
        break;
      }

      case ActionType.INSTALL_BUNDLE: {
        p = (async () => {
          const bundle = JSON.parse(action.bundle);
          harden(bundle);
          return validateAndInstallBundle(bundle);
        })().catch(error => {
          console.error(error);
        });
        break;
      }

      case ActionType.CORE_EVAL: {
        p = doBridgeInbound(BRIDGE_ID.CORE, action);
        break;
      }

      case ActionType.WALLET_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action);
        break;
      }

      case ActionType.WALLET_SPEND_ACTION: {
        p = doBridgeInbound(BRIDGE_ID.WALLET, action);
        break;
      }

      case ActionType.END_BLOCK: {
        p = endBlock(action.blockHeight, action.blockTime, latestParams);
        if (END_BLOCK_SPIN_MS) {
          // Introduce a busy-wait to artificially put load on the chain.
          p = p.then(res => {
            const startTime = Date.now();
            while (Date.now() - startTime < END_BLOCK_SPIN_MS);
            return finish(res);
          });
        }
        break;
      }

      default: {
        assert.fail(X`${action.type} not recognized`);
      }
    }
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

  async function blockingSend(action, savedChainSends) {
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
        await bootstrapBlock(action.blockTime);
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
        await saveOutsideState(
          computedHeight,
          action.blockTime,
          savedChainSends,
        );

        const saveTime = Date.now() - start2;

        console.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        flushChainSends(false);
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
            flushChainSends(true);
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
