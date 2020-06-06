// eslint-disable-next-line no-unused-vars
function makePolicy(endowments) {
  const { E, harden, console, timerManager, commander } = endowments;
  // 'commander' is 'undefined', or a promise for something from the chain's
  // registry. When you run `./install-policy delay-handler.js key123', our
  // 'commander' will be registry.get(key123).

  function makeChainHandler(_src, _dst, initialState) {
    let allowedCount = initialState;
    let requestP;
    const handler = harden({
      onPacket(target, packet) {
        if (allowedCount > 0) {
          allowedCount--;
          E(target).deliver(packet);
          return;
        }
        if (!requestP) {
          requestP = commander.allow(
            packet.srcPort,
            packet.srcChannel,
            packet.dstPort,
            packet.dstChannel,
          );
          requestP.then(count => (allowedCount += count));
        }
        // recur after the response comes back from the chain
        requestP.then(_ => handler.onPacket(target, packet));
      },
      onAck(target, ackPacket) {
        E(target).deliver(ackPacket);
      },
      onHandshake(target, metaPacket) {
        return true;
      },
      // Snapshot the deltas so we can pick up where we left off
      retire() {
        return allowedCount;
      },
    });
  }

  const deltaPolicy = harden({
    open(src, dst, oldState = 0) {
      return makeChainHandler(src, dst, oldState);
    },
  });

  return deltaPolicy;
}
