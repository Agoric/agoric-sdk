// eslint-disable-next-line no-unused-vars
function makePolicy(endowments) {
  const { E, harden, console, timerManager, commander } = endowments;
  // 'commander' is 'undefined', or a promise for something from the chain's
  // registry. When you run `./install-policy delay-handler.js key123', our
  // 'commander' will be registry.get(key123).

  // max allowed different in transfer of tokens before transactions get logged
  const limit = 10000;

  function makeDeltaHandler(_src, dst, oldState) {
    // a map from denoms to amounts
    const deltas = new Map(oldState);

    return harden({
      onPacket(target, packet) {
        const transfer = JSON.parse(packet.data);
        const { amount: amountStr, denom } = transfer.value.amount[0];
        const amount = Number(amountStr);

        // Delta is positive if more has moved to the `dst` chain
        const delta = deltas.get(denom) || 0;
        delta += target === dst ? amount : -amount;
        delta.set(denom, delta);
        if (Math.abs(delta) > limit) {
          console.log('Trade deficit: ', delta);
        }
        E(target).deliver(packet);
      },
      onAck(target, ackPacket) {
        E(target).deliver(ackPacket);
      },
      onHandshake(target, metaPacket) {
        return true;
      },
      // Snapshot the deltas so we can pick up where we left off
      retire() {
        return harden(Array.from(delta.entries()));
      },
    });
  }

  const deltaPolicy = harden({
    open(src, dst, oldState = []) {
      return makeDeltaHandler(src, dst, oldState);
    },
  });

  return deltaPolicy;
}
