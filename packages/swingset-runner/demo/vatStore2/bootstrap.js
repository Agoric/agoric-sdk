import { Fail } from '@endo/errors';
import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { makeXorShift128 } from './xorshift128.js';

const p = console.log;

const randomness = makeXorShift128();

function roll(limit) {
  return randomness.randomUint32() % limit;
}

export function buildRootObject() {
  let nextZotNumber = 1;
  const companions = [];
  const otherVats = [];
  const zots = [];

  function makeZot() {
    const name = `zot-${nextZotNumber}`;
    nextZotNumber += 1;
    return Far('zot', {
      say(message) {
        p(`${name} asked to say "${message}"`);
      },
      getName() {
        return name;
      },
    });
  }

  return Far('root', {
    async bootstrap(vats) {
      otherVats.push({ vat: vats.alice, name: 'Alice' });
      otherVats.push({ vat: vats.bob, name: 'Bob' });

      for (let i = 0; i < 5; i += 1) {
        for (const { vat } of otherVats) {
          const zot = makeZot();
          const companion = await E(vat).introduce(zot);
          companions.push(companion);
          zots.push(zot);
        }
      }

      for (let i = 0; i < 1000; i += 1) {
        const action = roll(4);
        const companion = companions[roll(companions.length)];
        switch (action) {
          case 0: {
            E(companion).echo(`profundity #${roll(10)}`);
            break;
          }
          case 1: {
            const zot = zots[roll(zots.length)];
            E(companion).changePartner(zot);
            break;
          }
          case 2: {
            E(companion).report();
            break;
          }
          case 3: {
            const { vat, name } = otherVats[roll(otherVats.length)];
            const hasIt = await E(vat).doYouHave(companion);
            // prettier-ignore
            p(`vat ${name} ${hasIt ? 'has' : 'does not have'} ${await E(companion).getLabel()}`);
            break;
          }
          default:
            Fail`this can't happen`;
        }
      }
      return 'done';
    },
  });
}
