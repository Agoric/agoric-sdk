// @ts-nocheck
import '@endo/init';
import sqlite3 from 'better-sqlite3';
import fs from 'fs';
import process from 'process';

// run this like:
//  node vat-map-from-swingstore.js run-04-swingstore.sqlite vat-map-04.json 04
//
// It will extract data about all vats from that SwingStore DB
// snapshot, and write it into the .json file. These can be compared
// with the neighboring vat-map-delta.js . The "04" runID is added to
// the data for the benefit of quick jq scripts that forget the
// filename they're looking at.

let asJSON = false;
const args = [];
for (const arg of process.argv.slice(2)) {
  if (arg === '--as-json') {
    asJSON = true;
  } else {
    args.push(arg);
  }
}
const [swingstoreDBPath, label] = args;
assert(
  fs.existsSync(swingstoreDBPath),
  `missing SQLite file: ${swingstoreDBPath}`,
);
const ssdb = sqlite3(swingstoreDBPath);

const sqlGet = ssdb
  .prepare('SELECT value FROM kvStore WHERE key = ?')
  .pluck(true);
const get = key => sqlGet.get(key);
const getJSON = key => JSON.parse(get(key));
const sqlGetRange = ssdb.prepare(
  'SELECT * FROM kvStore WHERE key >= ? AND key < ?',
);
const sqlGetCurrentSpan = ssdb.prepare(
  'SELECT * FROM transcriptSpans WHERE vatID = ? AND isCurrent=1',
);

const idNumber = (prefix, idString) => {
  assert(idString.startsWith(prefix));
  return Number(idString.slice(prefix.length));
};
const sortWith = (arr, keyFunc) => arr.sort((a, b) => keyFunc(a) - keyFunc(b));

const vatNames = getJSON('vat.names');
const staticIDs = vatNames.map(name => get(`vat.name.${name}`));
const dynamicIDs = getJSON('vat.dynamicIDs');
const allVatIDs = [...staticIDs, ...dynamicIDs];

sortWith(allVatIDs, vatID => idNumber('v', vatID)); // 'v12' -> 12
// console.log(allVatIDs);

// This list of ZCF bundle IDs was compiled by inspecting
// 'v9.vs.vc.1.szcfBundleCap' in different DB snapshots, then tracing
// the v9 device vref through the v9 c-list to a kref, then through
// the d10 c-list to a vref/dref/ddid, then to the bundle ID.

const knownZCFIDs = [
  // established at launch, aka namedBundleID.zcf, used through run-27, kd40 = v9:d-70
  'b1-039c67a6e86acfc64c3d8bce9a8a824d5674eda18680f8ecf071c59724798945b086c4bac2a6065bed7f79ca6ccc23e8f4a464dfe18f2e8eaa9719327107f15b',
  // introduced by upgrade-14, appears in run-28 through run-33, kd77 = v9:d-92
  'b1-f91c5f6099b5ff47700705d2530a7df9e7a9f3281c4dfe08105b4482fb46711bed472b2657c2bf0a362a2bba793260dcdb34fc24c8de2058e4381617c27d5ad7',
  // introduced by upgrade-15, appears in run-34 through run-43, kd80 = v9:d-93
  'b1-c443a563bc9db59a62ebd36ba973055b313bacb33ad8759923a6f6c1f6001fa68195939c1f9a55c972542bef634042a69cb522e9caa5abb0b0a2f0f950ccc7b4',
  // introduced by upgrade-16, appears in run-44 through at least run-53, kd85 = v9:d-95
  'b1-5ce9bb36ceb21c4af80b3c11098ac049ddfaa1898cf7a9e33d100c44f5fc68e5a14a96a5d2f9af0117929b3e5b4ab58c4a404416fb5688b03a2c0e398194e6b2',
  // Add more IDs here, mark with the govNN/upgradeNN which adds it
];

const deviceVatAdmin = get('device.name.vatAdmin');
// we happen to know how device-vat-admin manages its state, see
// packages/SwingSet/src/devices/vat-admin/device-vat-admin.js
const vdidToBundleID = vdid => get(`${deviceVatAdmin}.vs.slot.${vdid}`);
const kdidToVdid = kdid => get(`${deviceVatAdmin}.c.${kdid}`);
const kdidToBundleID = kdid => vdidToBundleID(kdidToVdid(kdid));

const importedKdids = vatID => {
  const kdids = [];
  // read all vNN.c.d-NN keys, the values are kdNN
  const start = `${vatID}.c.d-`;
  const end = `${vatID}.c.d.`;
  for (const row of sqlGetRange.all(start, end)) {
    kdids.push(row.value);
  }
  sortWith(kdids, kdid => idNumber('kd', kdid)); // 'kd12' -> 12
  return kdids;
};
const lastImportedKdid = vatID => importedKdids(vatID).at(-1);

const output = { label, currentZCF: undefined, vats: {} };

let zoeVatID;
for (const vatID of allVatIDs) {
  const source = getJSON(`${vatID}.source`).bundleID;
  const options = getJSON(`${vatID}.options`);
  const { name, critical, workerOptions } = options;
  if (name === 'zoe') {
    zoeVatID = vatID;
  }
  const { type } = workerOptions;
  let lockdownBundleID;
  let supervisorBundleID;
  if (type === 'xsnap') {
    [lockdownBundleID, supervisorBundleID] = workerOptions.bundleIDs;
  }

  const { incarnation, endPos } = sqlGetCurrentSpan.get(vatID);

  const vat = {
    name,
    critical,
    incarnation,
    endPos,
    source,
    type,
    lockdownBundleID,
    supervisorBundleID,
  };
  output.vats[vatID] = vat;

  if (!asJSON) {
    console.log(`${vatID}`);
    console.log(` name: ${name}`);
    console.log(` critical: ${critical}`);
    console.log(` incarnation: ${incarnation}`);
    console.log(` endPos: ${endPos}`);
    console.log(` source: ${source}`);
    console.log(` worker type: ${type}`);
    console.log(` lockdown: ${lockdownBundleID}`);
    console.log(` supervisor: ${supervisorBundleID}`);
  }

  // contract vats will launch from a ZCF bundle, and Zoe will label
  // them as "zcf-*"
  if (name.startsWith('zcf-')) {
    if (!knownZCFIDs.includes(source)) {
      console.log(`${vatID} claims to be contract but not using known ZCF`);
      console.log(`TODO: maybe add to knownZCFIDs ?`);
      console.log(`name: ${name}`);
      console.log(`source: ${source}`);
      process.exit(1);
    }
    const kdid = lastImportedKdid(vatID);
    assert(kdid);
    const contractBundleID = kdidToBundleID(kdid);
    if (!asJSON) {
      console.log(` contract bundle: ${contractBundleID}`);
    }
    vat.contractBundleID = contractBundleID;
  }

  if (!asJSON) {
    console.log();
  }
}

// figure out currently-available ZCF bundle by snooping v9-zoe's
// baggage

assert(zoeVatID);
const zoeZCFBaggageName = 'zcfBundleCap';
const zoeCurrentZCFvref = getJSON(`${zoeVatID}.vs.vc.1.s${zoeZCFBaggageName}`)
  .slots[0];
const zoeCurrentZCFkref = get(`${zoeVatID}.c.${zoeCurrentZCFvref}`);
const zoeCurrentZCFBundleID = kdidToBundleID(zoeCurrentZCFkref);
if (!asJSON) {
  console.log(`current zoe ZCF: ${zoeCurrentZCFBundleID}`);
}
output.currentZCF = zoeCurrentZCFBundleID;

if (asJSON) {
  console.log(JSON.stringify(output));
}

// note: we don't record "current" versions of lockdown and supervisor
// bundle IDs, we just sample each time a vat is created or upgraded
