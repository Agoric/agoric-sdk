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
        talkToBot(pbot, botName) {
          log(`=> user.talkToBot is called with ${botName}`);
          pbot
            ~.encourageMe({ name: 'user' })
            .then(myEncouragement =>
              log(`=> user receives the encouragement: ${myEncouragement}`),
            );
          return 'Thanks for the setup. I sure hope I get some encouragement...';
        },
      }),
    helpers.vatID,
  );
}
