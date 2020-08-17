import { E } from '@agoric/eventual-send';

const log = console.log;

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

export function buildRootObject(_vatPowers) {
  let myNickname;
  let otherContact = null;

  function makeContact() {
    let otherNickname = 'unknown';
    let total = 0;

    return harden({
      ping(tag, count) {
        total += 1;
        if (count > 0) {
          if (ppp(count)) {
            log(
              `=> ${myNickname} contact for ${otherNickname} receives ping: ${count} ${tag}`,
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
      myNameIs(nickname) {
        otherNickname = nickname;
        log(`=> ${myNickname} contact is now named ${otherNickname}`);
      },
    });
  }

  return harden({
    setNickname(nickname) {
      myNickname = nickname;
    },
    introduceYourselfTo(other) {
      log(`=> ${myNickname}.introduce`);
      const myContact = makeContact();
      otherContact = E(other).hello(myContact, myNickname);
      return `${myNickname} setup done\n${myNickname} vat is happy\n`;
    },
    grind(tag, count) {
      E(otherContact).ping(tag, count);
    },
  });
}
