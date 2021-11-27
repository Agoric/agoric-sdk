/* global process */
import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';
import { isObject } from '@agoric/marshal';
import { Nat } from '@agoric/nat';

const console = anylogger('block-manager');

const BOOTSTRAP_BLOCK = 'BOOTSTRAP_BLOCK';
const BEGIN_BLOCK = 'BEGIN_BLOCK';
const DELIVER_INBOUND = 'DELIVER_INBOUND';
const END_BLOCK = 'END_BLOCK';
const COMMIT_BLOCK = 'COMMIT_BLOCK';
const IBC_EVENT = 'IBC_EVENT';
const PLEASE_PROVISION = 'PLEASE_PROVISION';
const VBANK_BALANCE_UPDATE = 'VBANK_BALANCE_UPDATE';

// Artificially create load if set.
const END_BLOCK_SPIN_MS = process.env.END_BLOCK_SPIN_MS
  ? parseInt(process.env.END_BLOCK_SPIN_MS, 10)
  : 0;

const stringToNat = s => {
  assert.typeof(s, 'string', X`${s} must be a string`);
  const bint = BigInt(s);
  const nat = Nat(bint);
  assert.equal(
    `${nat}`,
    s,
    X`${s} must be the canonical representation of ${nat}`,
  );
  return nat;
};

// Map the SwingSet parameters to a deterministic data structure.
//
// NOTE: `params` is JSON-marshalled by Protobuf 3, so it is already
// deterministic (though maybe ordered differently than alphabetical).
const parseParams = params => {
  const {
    beans_per_unit: rawBeansPerUnit,
    fee_unit_price: rawFeeUnitPrice,
  } = params;
  assert.equal(
    Object(rawBeansPerUnit),
    rawBeansPerUnit,
    X`beansPerUnit must be an object, not ${rawBeansPerUnit}`,
  );
  const beansPerUnit = Object.fromEntries(
    Object.keys(rawBeansPerUnit)
      .sort()
      .map(key => {
        assert.typeof(key, 'string', X`Key ${key} must be a string`);
        const beans = rawBeansPerUnit[key];
        assert.equal(
          Object(beans),
          beans,
          X`${key} beans must be an object, not ${beans}`,
        );
        const { whole, ...rest } = beans;
        assert.equal(
          Object.keys(rest).length,
          0,
          X`${key} beans must have no unexpected properties; had ${rest}`,
        );
        return [key, stringToNat(whole)];
      }),
  );

  assert(
    Array.isArray(rawFeeUnitPrice),
    X`feeUnitPrice ${rawFeeUnitPrice} must be an array`,
  );
  const feeUnitPrice = rawFeeUnitPrice.map(({ denom, amount }) => {
    assert.typeof(denom, 'string', X`denom ${denom} must be a string`);
    assert(denom, X`denom ${denom} must be non-empty`);
    return { denom, amount: stringToNat(amount) };
  });

  return { beansPerUnit, feeUnitPrice };
};

export default function makeBlockManager({
  deliverInbound,
  doBridgeInbound,
  bootstrapBlock,
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
  let chainTime;

  async function kernelPerformAction(action) {
    // TODO warner we could change this to run the kernel only during END_BLOCK
    const start = Date.now();
    function finish() {
      // console.error('Action', action.type, action.blockHeight, 'is done!');
      runTime += Date.now() - start;
    }

    // console.error('Performing action', action);
    let p;
    switch (action.type) {
      case BEGIN_BLOCK:
        p = beginBlock(
          action.blockHeight,
          action.blockTime,
          parseParams(action.params),
        );
        break;

      case DELIVER_INBOUND:
        p = deliverInbound(
          action.peer,
          action.messages,
          action.ack,
          action.blockHeight,
          action.blockTime,
          parseParams(action.params),
        );
        break;

      case VBANK_BALANCE_UPDATE: {
        p = doBridgeInbound('bank', action);
        break;
      }

      case IBC_EVENT: {
        p = doBridgeInbound('dibc', action);
        break;
      }

      case PLEASE_PROVISION: {
        p = doBridgeInbound('provision', action);
        break;
      }

      case END_BLOCK: {
        p = endBlock(
          action.blockHeight,
          action.blockTime,
          parseParams(action.params),
        );
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

      default:
        assert.fail(X`${action.type} not recognized`);
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

  let currentActions = [];
  let decohered;

  async function blockManager(action, savedChainSends) {
    if (decohered) {
      throw decohered;
    }

    // console.warn('FIGME: blockHeight', action.blockHeight, 'received', action.type)
    switch (action.type) {
      case BOOTSTRAP_BLOCK: {
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

      case COMMIT_BLOCK: {
        verboseBlocks && console.info('block', action.blockHeight, 'commit');
        if (action.blockHeight !== computedHeight) {
          throw Error(
            `Committed height ${action.blockHeight} does not match computed height ${computedHeight}`,
          );
        }

        // Save the kernel's computed state just before the chain commits.
        const start2 = Date.now();
        await saveOutsideState(computedHeight, savedActions, savedChainSends);

        const saveTime = Date.now() - start2;

        console.debug(
          `wrote SwingSet checkpoint [run=${runTime}ms, chainSave=${chainTime}ms, kernelSave=${saveTime}ms]`,
        );

        flushChainSends(false);
        break;
      }

      case BEGIN_BLOCK: {
        verboseBlocks && console.info('block', action.blockHeight, 'begin');

        // Start a new block, or possibly replay the prior one.
        const leftover = currentActions
          .filter(a => a.blockHeight !== action.blockHeight)
          .map(a => a.type)
          .join(', ');
        if (leftover) {
          // Leftover actions happen if queries or simulation are incorrectly
          // resulting in accidental VM messages.
          decohered = Error(
            `Block ${action.blockHeight} begun with leftover uncommitted actions: ${leftover}`,
          );
          throw decohered;
        }

        currentActions = [];
        runTime = 0;
        currentActions.push(action);
        break;
      }

      case END_BLOCK: {
        currentActions.push(action);

        // eslint-disable-next-line no-use-before-define
        if (computedHeight > 0 && !deepEquals(currentActions, savedActions)) {
          // We only handle the trivial case.
          const restoreHeight = action.blockHeight - 1;
          // We can reset from -1 or 0 to anything, since that's what happens
          // when genesis.initial_height !== "1".
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
          chainTime = Date.now() - start;

          // Advance our saved state variables.
          savedActions = currentActions;
          computedHeight = action.blockHeight;
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
  if (!isObject(a) || !isObject(b)) {
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
