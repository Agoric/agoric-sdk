import harden from '@agoric/harden';
import { encourage } from './encourage';

export default harden((_terms, _inviteMaker) => {
  return harden({
    encourageMe(name) {
      // log(`=> encouragementBot.encourageMe got the name: ${name}`);
      return encourage(name);
    },
  });
});
