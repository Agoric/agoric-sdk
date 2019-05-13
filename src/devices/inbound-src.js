import harden from '@agoric/harden';

export default function setup(syscall, helpers, endowments) {
  const { bridge } = endowments;
  function getState() {
    return {};
  }
  function setState(_newState) {
    throw new Error('inbound device not yet able to setState');
  }

  return helpers.makeDeviceSlots(
    syscall,
    SO =>
      harden({
        registerInboundCallback(handler) {
          bridge.inboundCallback = (sender, message) => {
            try {
              SO(handler).inbound(`${sender}`, `${message}`);
            } catch (e) {
              console.log(`error during inboundCallback: ${e} ${e.message}`);
            }
          };
        },
      }),
    getState,
    setState,
    helpers.name,
  );
}
