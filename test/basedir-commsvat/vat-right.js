import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    _E =>
      harden({
        method() {
          log(`=> right.method was invoked`);
        },
        takeArgAndReturnData(arg) {
          log(`=> right.takeArgAndReturnData got the arg: ${arg}`);
          return `${arg} was received`;
        },
        takeReferenceEqualToTargetAndReturnData(ref) {
          log(
            `=> right.takeReferenceEqualToTargetAndReturnData got the arg: ${ref}`,
          );
          return `ref was received`;
        },
      }),
    helpers.vatID,
  );
}
