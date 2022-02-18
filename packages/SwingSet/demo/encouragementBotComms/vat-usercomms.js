import buildCommsDispatch from '../../src/vats/comms/index.js';

export default (syscall, _state, _helpers, _vatPowers) =>
  buildCommsDispatch(syscall);
