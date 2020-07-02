/* global harden */

function build(_E, log) {
  return harden({
    foo(p) {
      log('=> Carol: in foo');
      p.then(
        r => log(`=> Carol: in foo p resolved to '${r}'`),
        e => log(`=> Carol: in foo p rejected as '${e}'`),
      );
      log('=> Carol: foo done');
      return 'Carol says foo';
    },
    bar(p) {
      log('=> Carol: in bar');
      p.then(
        r => log(`=> Carol: in bar p resolved to '${r}'`),
        e => log(`=> Carol: in bar p rejected as '${e}'`),
      );
      log('=> Carol: bar done');
      return 'Carol says bar';
    },
  });
}

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }
  return helpers.makeLiveSlots(
    syscall,
    state,
    E => build(E, log),
    helpers.vatID,
  );
}
