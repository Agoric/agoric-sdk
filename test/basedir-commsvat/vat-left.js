import harden from '@agoric/harden';

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E =>
      harden({
        callMethodOnPresence(presence, args) {
          log(`=> left.callMethodOnPresence is called with args: [${args}]`);
          if (args.length <= 0) {
            E(presence).method();
          } else {
            E(presence)
              .takeArgAndReturnData(args)
              .then(returnedData => {
                log(`=> left vat receives the returnedData: ${returnedData}`);
              });
          }
          return 'presence was called';
        },
        callMethodOnPresenceWithRef(presence) {
          E(presence)
            .takeReferenceEqualToTargetAndReturnData(presence)
            .then(returnedData => {
              log(`=> left vat receives the returnedData: ${returnedData}`);
            });
          return 'presence was called';
        },
      }),
    helpers.vatID,
  );
}
