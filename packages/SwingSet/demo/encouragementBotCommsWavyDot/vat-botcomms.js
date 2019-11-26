import buildCommsDispatch from '../../src/vats/comms';

export default function setup(syscall, state, helpers) {
  return buildCommsDispatch(syscall, state, helpers);
}
