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
  let total = 0;

  function makeContact(otherContact, otherNickname) {
    return Far('contact', {
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

  return Far('root', {
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
