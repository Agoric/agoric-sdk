/* global process */
import assert from 'assert';
import { execFile } from 'child_process';

const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }

const [_node, _script, previousOffer, voteDur, debtLimit] = process.argv;
assert(previousOffer, 'previousOffer is required');
assert(voteDur, 'voteDur is required');
assert(debtLimit, 'debtLimit is required');
const voteDurSec = BigInt(voteDur);
const debtLimitValue = BigInt(debtLimit) * ISTunit;

const toSec = ms => BigInt(Math.round(ms / 1000));

const id = `propose-${Date.now()}`;
const deadline = toSec(Date.now()) + voteDurSec;

// look up boardIDs for brands, instances in agoricNames

// poor-man's zx
const $ = cmd => {
  console.error(cmd);
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

const instance = fromSmallCapsEntries(
  await $('agoric follow -lF :published.agoricNames.instance -o text'),
);
assert(instance.VaultFactory);

const brand = fromSmallCapsEntries(
  await $('agoric follow -lF :published.agoricNames.brand -o text'),
);
assert(brand.IST);
assert(brand.ATOM);

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
      invitationMakerName: 'VoteOnParamChange',
      previousOffer,
      source: 'continuing',
    },
    offerArgs: {
      deadline: smallCaps.Nat(deadline),
      instance: smallCaps.ref(instance.VaultFactory),
      params: {
        DebtLimit: {
          brand: smallCaps.ref(brand.IST),
          value: smallCaps.Nat(debtLimitValue),
        },
      },
      path: {
        paramPath: {
          key: {
            collateralBrand: smallCaps.ref(brand.ATOM),
          },
        },
      },
    },
    proposal: {},
  },
};

const capData = { body: `#${JSON.stringify(body)}`, slots };
const action = JSON.stringify(capData);

console.log(action);
