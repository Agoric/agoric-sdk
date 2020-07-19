/* global harden */

// This javascript source file uses the "tildot" syntax (foo~.bar()) for
// eventual sends.
// https://agoric.com/documentation/ertp/guide/other-concepts.html
//  Tildot is standards track with TC39, the JavaScript standards committee.
// https://github.com/tc39/proposal-wavy-dot

export default function setup(syscall, state, helpers) {
  function log(what) {
    helpers.log(what);
    console.log(what);
  }

  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers =>
      harden({
        encourageMe(nameObj) {
          // Test of tildot property get.
          return nameObj~.name.then(name => {
            log(`=> encouragementBot.encourageMe got the name: ${name}`);
            return `${name}, you are awesome, keep it up!`;
          });
        },
      }),
    helpers.vatID,
  );
}
