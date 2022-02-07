import buildCommsDispatch from '../../src/vats/comms/index.js';

export default function setup(syscall, _state, _helpers, _vatPowers) {
  return buildCommsDispatch(syscall);
}
