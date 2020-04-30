import anylogger from 'anylogger';

const log = anylogger('block-manager');

const BEGIN_BLOCK = 'BEGIN_BLOCK';
const DELIVER_INBOUND = 'DELIVER_INBOUND';
const END_BLOCK = 'END_BLOCK';
const COMMIT_BLOCK = 'COMMIT_BLOCK';
const IBC_EVENT = 'IBC_EVENT';

export default function makeBlockManager({
  deliverInbound,
  doBridgeInbound,
  beginBlock,
  flushChainSends,
  saveChainState,
  saveOutsideState,
  savedActions,
  savedHeight,
}) {
  let computedHeight = savedHeight;
  let runTime = 0;

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

      case END_BLOCK:
        p = Promise.resolve();
        break;

      default:
        throw new Error(`${action.type} not recognized`);
    }
    p.then(finish, finish);
    return p;
  }

  let currentActions = [];
  let decohered;
  let saveTime = 0;

  async function blockManager(action) {
    if (decohered) {
      throw decohered;
    }

    switch (action.type) {
      case COMMIT_BLOCK: {
        if (action.blockHeight !== computedHeight) {
          throw Error(
            `Committed height ${action.blockHeight} does not match computed height ${computedHeight}`,
          );
        }

        const start = Date.now();

        // Save the kernel's computed state because we've committed
        // the block (i.e. have obtained consensus on the prior
        // state).
        saveOutsideState(computedHeight, savedActions);
        savedHeight = computedHeight;

        saveTime = Date.now() - start;
        currentActions = [];
        break;
      }

      case BEGIN_BLOCK: {
        // Start a new block, or possibly replay the prior one.
        for (const a of currentActions) {
          if (a.blockHeight !== action.blockHeight) {
            console.warn(
              'Warning: Block',
              action.blockHeight,
              'begun with a leftover uncommitted action:',
              a,
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
          if (restoreHeight !== computedHeight) {
            // Keep throwing forever.
            decohered = Error(
              `Unimplemented reset state from ${computedHeight} to ${restoreHeight}`,
            );
            throw decohered;
          }
        }

        if (computedHeight === action.blockHeight) {
          // We are reevaluating, so send exactly the same downcalls to the chain.
          //
          // This is necessary since the block proposer will be asked to validate
          // the actions it just proposed (in Tendermint v0.33.0).
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
            // TODO warner maybe change kernelPerformAction to enqueue but not run the kernel
          }
        }

        // Always commit all the keeper state live.
        const start = Date.now();
        const { mailboxSize } = saveChainState();
        const mbTime = Date.now() - start;
        log.debug(
          `wrote SwingSet checkpoint (mailbox=${mailboxSize}), [run=${runTime}ms, mb=${mbTime}ms, save=${saveTime}ms]`,
        );

        // Advance our saved state variables.
        savedActions = currentActions;
        computedHeight = action.blockHeight;
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
