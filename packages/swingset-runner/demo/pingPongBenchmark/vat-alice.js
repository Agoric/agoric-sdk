import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

export function buildRootObject() {
  let myNickname;
  let otherNickname = 'unknown';
  let otherContact = null;

  function makeContact() {
    return Far('contact', {
      myNameIs(nickname) {
        otherNickname = nickname;
        log(`${myNickname}: contact is now named ${otherNickname}`);
      },
      pong(tag, ponger) {
        log(`${myNickname}: ponged with "${tag}" by ${ponger}`);
      },
    });
  }

  return Far('root', {
    setNickname(nickname) {
      myNickname = nickname;
    },
    introduceYourselfTo(other) {
      log(`${myNickname}.introduce`);
      const myContact = makeContact();
      otherContact = E(other).hello(myContact, myNickname);
      return `${myNickname} setup done\n${myNickname} vat is happy\n`;
    },
    doPing(tag) {
      log(`${myNickname}: pings ${otherNickname} with ${tag}`);
      E(otherContact).ping(tag);
    },
  });
}
