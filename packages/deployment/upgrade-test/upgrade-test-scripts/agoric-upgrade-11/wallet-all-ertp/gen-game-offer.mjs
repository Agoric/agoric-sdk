/* eslint-disable @jessie.js/safe-await-separator */
/* global process */
import assert from 'assert';
import { execFile } from 'child_process';

const ISTunit = 1_000_000n; // aka displayInfo: { decimalPlaces: 6 }
const CENT = ISTunit / 100n;

const [_node, _script, ...choices] = process.argv;

const toSec = ms => BigInt(Math.round(ms / 1000));

const id = `join-${Date.now()}`;

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

const wkInstance = fromSmallCapsEntries(
  await $('agoric follow -lF :published.agoricNames.instance -o text'),
);
assert(wkInstance.VaultFactory);

const wkBrand = fromSmallCapsEntries(
  await $('agoric follow -lF :published.agoricNames.brand -o text'),
);
assert(wkBrand.IST);
assert(wkBrand.Place);

const slots = []; // XXX global mutable state

// XXX should use @endo/marshal
const smallCaps = {
  Nat: n => `+${n}`,
  replacer: (k, v) =>
    typeof v === 'bigint'
      ? `+${v}`
      : typeof v === 'symbol'
      ? `%${v.description}`
      : v,
  // XXX mutates obj
  ref: obj => {
    if (obj.ix) return obj.ix;
    const ix = slots.length;
    slots.push(obj.boardID);
    obj.ix = `$${ix}.Alleged: ${obj.iface}`;
    return obj.ix;
  },
};

const AmountMath = {
  make: (brand, value) => ({
    brand: smallCaps.ref(brand),
    value: typeof value === 'bigint' ? smallCaps.Nat(value) : value,
  }),
};

const makeTagged = (tag, payload) => ({
  '#tag': tag,
  payload,
});

const makeCopyBag = entries => makeTagged('copyBag', entries);
const want = {
  Places: AmountMath.make(
    wkBrand.Place,
    makeCopyBag(choices.map(name => [name, 1n])),
  ),
};

const give = { Price: AmountMath.make(wkBrand.IST, 25n * CENT) };
const body = {
  method: 'executeOffer',
  offer: {
    id,
    invitationSpec: {
      source: 'contract',
      instance: smallCaps.ref(wkInstance.game1),
      publicInvitationMaker: 'makeJoinInvitation',
    },
    proposal: { give, want },
  },
};

console.error(JSON.stringify(body.offer, smallCaps.replacer, 1));

const capData = {
  body: `#${JSON.stringify(body, smallCaps.replacer)}`,
  slots,
};
const action = JSON.stringify(capData);

console.log(action);
