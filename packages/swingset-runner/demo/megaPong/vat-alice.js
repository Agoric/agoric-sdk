import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';

const log = console.log;

// Ping Print Predicate, a hack to reduce log spam
function ppp(count) {
  if (count > 9999) {
    return count % 9999 === 0;
  } else if (count > 999) {
    return count % 999 === 0;
  } else if (count > 99) {
    return count % 99 === 0;
  } else if (count > 9) {
    return count % 9 === 0;
  } else {
    return true;
  }
}

export function buildRootObject() {
  let myNickname;
  let otherContact = null;

  function makeContact() {
    let otherNickname = 'unknown';
    let total = 0;

    return Far('contact', {
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

  return Far('root', {
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
