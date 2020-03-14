import harden from '@agoric/harden';

// Ping Print Predicate, a hack to reduce log spam
function ppp(count) {
  if (count > 10000) {
    return count % 10000 === 0;
  } else if (count > 1000) {
    return count % 1000 === 0;
  } else if (count > 100) {
    return count % 100 === 0;
  } else if (count > 10) {
    return count % 10 === 0;
  } else {
    return true;
  }
}

function build(E, log) {
  let myNickname;
  let total = 0;

  function makeContact(otherContact, otherNickname) {
    return harden({
      ping(tag, count) {
        total += 1;
        if (count > 0) {
          if (ppp(count)) {
            log(
              `=> ${myNickname} contact for ${otherNickname} receives ping #${total}: ${count} ${tag}`,
            );
          }
          E(otherContact).ping(tag, count - 1);
        } else if (count < 0) {
          if (ppp(total)) {
            log(
              `=> ${myNickname} contact for ${otherNickname} receives ping #${total}: ${tag}`,
            );
          }
          E(otherContact).ping(tag, count);
        }
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
      log(`=> ${myNickname}.hello sees ${otherNickname}`);
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
