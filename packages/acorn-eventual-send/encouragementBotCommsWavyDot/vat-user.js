/* global harden */

// This javascript source file uses the "tildot" syntax (foo~.bar()) for
// eventual sends.
// https://agoric.com/documentation/ertp/guide/other-concepts.html
//  Tildot is standards track with TC39, the JavaScript standards committee.
// https://github.com/tc39/proposal-wavy-dot

export function buildRootObject(_vatPowers) {
  return harden({
    talkToBot(pbot, botName) {
      console.log(`=> user.talkToBot is called with ${botName}`);
      pbot
      ~.encourageMe('user')
        .then(myEncouragement =>
              console.log(`=> user receives the encouragement: ${myEncouragement}`),
             );
      return 'Thanks for the setup. I sure hope I get some encouragement...';
    },
  });
}
