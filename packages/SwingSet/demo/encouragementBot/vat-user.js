import { Far, E } from '@endo/far';

export function buildRootObject(vatPowers) {
  const log = vatPowers.testLog;
  return Far('root', {
    talkToBot(bot, botName) {
      log(`=> user.talkToBot is called with ${botName}`);
      E(bot)
        .encourageMe('user')
        .then(myEncouragement =>
          log(`=> user receives the encouragement: ${myEncouragement}`),
        );
      return 'Thanks for the setup. I sure hope I get some encouragement...';
    },
  });
}
