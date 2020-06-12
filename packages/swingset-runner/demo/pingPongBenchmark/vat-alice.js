import harden from '@agoric/harden';

function build(E, log) {
  let myNickname;
  let otherNickname = 'unknown';
  let otherContact = null;

  function makeContact() {
    return harden({
      myNameIs(nickname) {
        otherNickname = nickname;
        log(`${myNickname}: contact is now named ${otherNickname}`);
      },
      pong(tag, ponger) {
        log(`${myNickname}: ponged with "${tag}" by ${ponger}`);
      },
    });
  }

  return harden({
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
