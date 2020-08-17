import { E } from '@agoric/eventual-send';

const log = console.log;

export function buildRootObject(_vatPowers) {
  let myNickname;

  function makeContact(otherContact, otherNickname) {
    return harden({
      ping(tag) {
        log(`${myNickname}: pinged with "${tag}", ponging ${otherNickname}`);
        E(otherContact).pong(tag, myNickname);
      },
    });
  }

  return harden({
    setNickname(nickname) {
      myNickname = nickname;
    },
    hello(otherContact, otherNickname) {
      const myContact = makeContact(otherContact, otherNickname);
      E(otherContact).myNameIs(myNickname);
      log(`${myNickname}.hello sees ${otherNickname}`);
      return myContact;
    },
  });
}
