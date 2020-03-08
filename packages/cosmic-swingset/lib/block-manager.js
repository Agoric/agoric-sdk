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

const BEGIN_BLOCK = 'BEGIN_BLOCK';
const DELIVER_INBOUND = 'DELIVER_INBOUND';
const END_BLOCK = 'END_BLOCK';

export default function makeBlockManager({
  deliverInbound,
  beginBlock,
  saveChainState,
  saveOutsideState,
  savedActions,
  savedHeight,
}) {
  let runTime = 0;
  async function kernelPerformAction(action) {
    const start = Date.now();
    const finish = _ => (runTime += Date.now() - start);

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

      case END_BLOCK:
        return true;

      default:
        throw new Error(`${action.type} not recognized`);
    }
    p.then(finish, finish);
    return p;
  }

  let currentActions;
  let currentIndex;
  let replaying;
  let decohered;

  async function blockManager(action) {
    if (decohered) {
      throw decohered;
    }

    if (action.type === BEGIN_BLOCK) {
      // Start a new block, or possibly replay the prior one.
      replaying = action.blockHeight === savedHeight;
      currentIndex = 0;
      currentActions = [];
      runTime = 0;
    } else {
      // We're working on a subsequent actions.
      currentIndex += 1;
    }

    currentActions.push(action);

    if (!replaying) {
      // Compute new state by running the kernel.
      await kernelPerformAction(action);
    } else if (!deepEquals(action, savedActions[currentIndex])) {
      // Divergence of the inbound messages, so rewind the state if we need to.
      console.log(action, 'and', savedActions[currentIndex], 'are not equal');
      replaying = false;

      // We only handle the trivial case.
      const restoreHeight = action.blockHeight - 1;
      if (restoreHeight !== savedHeight) {
        // Keep throwing forever.
        decohered = Error(
          `Cannot reset state from ${savedHeight} to ${restoreHeight}; unimplemented`,
        );
        throw decohered;
      }

      // Replay the saved actions.
      for (const a of currentActions) {
        // eslint-disable-next-line no-await-in-loop
        await kernelPerformAction(a);
      }
    }

    if (action.type !== END_BLOCK) {
      return;
    }

    // Commit all the keeper state, even on replay.
    // This is necessary since the block proposer will be asked to validate
    // the actions it just proposed (in Tendermint v0.33.0).
    let start = Date.now();
    const { mailboxSize } = saveChainState();
    let now = Date.now();

    const mbTime = now - start;
    start = now;

    // Advance our saved state variables.
    savedActions = currentActions;
    savedHeight = action.blockHeight;

    if (!replaying) {
      // Save the kernel's new state.
      saveOutsideState(savedHeight, savedActions);
    }
    now = Date.now();
    const saveTime = now - start;

    console.log(
      `wrote SwingSet checkpoint (mailbox=${mailboxSize}), [run=${runTime}ms, mb=${mbTime}ms, save=${saveTime}ms]`,
    );
  }

  return blockManager;
}
