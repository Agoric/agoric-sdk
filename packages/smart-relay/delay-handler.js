// eslint-disable-next-line no-unused-vars
function makePolicy(endowments) {
  const { E, harden, console, timerManager, commander } = endowments;
  // 'commander' is 'undefined', or a promise for something from the chain's
  // registry. When you run `./install-policy delay-handler.js key123', our
  // 'commander' will be registry.get(key123).

  // this delivers every message, but one second late

  // invoke the `callback` after `seconds` pass
  function wait(seconds, callback) {
    const handler = harden({ wake: callback });
    E(timerManager).setWakeup(seconds, handler);
  }

  // Delay packets for a specified time
  function makeDelayHandler(_src, _dst, _oldState) {
    return harden({
      onPacket(target, packet) {
        console.log(`delaying packet by 2s`);
        wait(2.0, () => E(target).deliver(packet));
      },
      onAck(target, ackPacket) {
        console.log(`delaying ack by 2s`);
        wait(2.0, () => E(target).deliver(ackPacket));
      },
      onHandshake(target, metaPacket) {
        console.log(`delaying handshake by 1s`);
        return wait(1.0, () => true);
      },
      retire() {
        return undefined;
      },
    });
  }

  const delayPolicy = harden({
    open(src, dest, oldState = undefined) {
      return makeDelayHandler(oldState);
    },
  });

  return delayPolicy;
}
