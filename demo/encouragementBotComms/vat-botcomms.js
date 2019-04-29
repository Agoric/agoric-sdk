export default function setup(syscall, state, helpers, devices) {
  return helpers.makeCommsSlots(syscall, state, helpers, devices);
}
