import { Far } from '@agoric/marshal';

// This javascript source file uses the "tildot" syntax (foo~.bar()) for
// eventual sends.
// https://agoric.com/documentation/ertp/guide/other-concepts.html
//  Tildot is standards track with TC39, the JavaScript standards committee.
// https://github.com/tc39/proposal-wavy-dot

export function buildRootObject(vatPowers) {
  return Far('root', {
    encourageMe(nameObj) {
      // Test of tildot property get.
      return nameObj~.name.then(name => {
        vatPowers.testLog(`=> encouragementBot.encourageMe got the name: ${name}`);
        return `${name}, you are awesome, keep it up!`;
      });
    },
  });
}
