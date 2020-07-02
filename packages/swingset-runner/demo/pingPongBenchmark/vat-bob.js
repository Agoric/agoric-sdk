/* global harden */

function build(E, log) {
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
