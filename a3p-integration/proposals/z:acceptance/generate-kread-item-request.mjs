/* global process */
import assert from 'assert';
import { execFile } from 'child_process';

const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }

const id = `KREAd-test-${Date.now()}`;

// poor-man's zx
const $ = cmd => {
  const [file, ...args] = cmd.split(' ');

  return new Promise((resolve, reject) => {
    execFile(file, args, { encoding: 'utf8' }, (err, out) => {
      if (err) return reject(err);
      resolve(out);
    });
  });
};

const zip = (xs, ys) => xs.map((x, i) => [x, ys[i]]);

const fromSmallCapsEntries = txt => {
  const { body, slots } = JSON.parse(txt);
  const theEntries = zip(JSON.parse(body.slice(1)), slots).map(
    ([[name, ref], boardID]) => {
      const iface = ref.replace(/^\$\d+\./, '');
      return [name, { iface, boardID }];
    },
  );
  return Object.fromEntries(theEntries);
};

const brand = fromSmallCapsEntries(
  await $('agoric follow -lF :published.agoricNames.brand -o text'),
);
assert(brand.IST);

const slots = []; // XXX global mutable state

const smallCaps = {
  Nat: n => `+${n}`,
  // XXX mutates obj
  ref: obj => {
    if (obj.ix) return obj.ix;
    const ix = slots.length;
    slots.push(obj.boardID);
    obj.ix = `$${ix}.Alleged: ${obj.iface}`;
    return obj.ix;
  },
};

const body = {
  method: 'executeOffer',
  offer: {
    id,
    invitationSpec: {
      source: 'agoricContract',
      instancePath: ['kread'],
      callPipe: [['makeMintCharacterInvitation', []]],
    },
    offerArgs: { name: 'ephemeral_Ace' },
    proposal: {
      give: {
        Price: {
          brand: smallCaps.ref(brand.IST),
          value: smallCaps.Nat(5n * ISTunit) }
      },
    },
  },
};

const capData = { body: `#${JSON.stringify(body)}`, slots };
const action = JSON.stringify(capData);

console.log(action);
