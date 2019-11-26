import harden from '@agoric/harden';

export default function setup(syscall, state, helpers, endowments) {
  const { bridge } = endowments;
  let { inboundHandler } = state.get() || {};

  return helpers.makeDeviceSlots(
    syscall,
    state,
    s => {
      const { SO } = s;
      bridge.inboundCallback = (sender, message) => {
        if (!inboundHandler) {
          throw new Error(
            `inboundHandler not set before bridge.inboundCallback`,
          );
        }
        try {
          SO(inboundHandler).inbound(`${sender}`, `${message}`);
        } catch (e) {
          console.log(`error during inboundCallback: ${e} ${e.message}`);
        }
      };
      return harden({
        // todo: rename this to registerInboundHandler for consistency
        registerInboundCallback(handler) {
          inboundHandler = handler;
          state.set({ inboundHandler });
        },
      });
    },
    helpers.name,
  );
}
