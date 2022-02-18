import buildCommsDispatch from '@agoric/swingset-vat/src/vats/comms/index.js';

export default (syscall, _state, _helpers, _vatPowers) =>
  buildCommsDispatch(syscall);
