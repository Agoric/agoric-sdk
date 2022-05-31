// XXX this is wrong; it needs to use the swingstore instead of opening the LMDB
// file directly, then use stream store reads to get the transcript entries.
import lmdb from 'lmdb';
import process from 'process';
import fs from 'fs';

const argv = process.argv.splice(2);
const dirPath = argv[0];
const vatName = argv[1];

if (!dirPath) {
  console.log('extract-transcript-from-kerneldb DBDIR : list all vats in DB');
  console.log(
    'extract-transcript-from-kerneldb DBDIR VATID|VatName : extract transcript',
  );
  process.exit(0);
}

const lmdbEnv = new lmdb.Env();
lmdbEnv.open({
  path: dirPath,
  mapSize: 2 * 1024 * 1024 * 1024, // XXX need to tune this
});

const dbi = lmdbEnv.openDbi({
  name: 'swingset-kernel-state',
  create: false,
});
const txn = lmdbEnv.beginTxn();
function get(key) {
  return txn.getString(dbi, key);
}

const allVatNames = JSON.parse(get('vat.names'));
const allDynamicVatIDs = JSON.parse(get('vat.dynamicIDs'));

if (!vatName) {
  console.log(`all vats:`);
  for (const name of allVatNames) {
    const vatID = get(`vat.name.${name}`);
    const transcriptLength = Number(get(`${vatID}.t.nextID`));
    console.log(`${vatID} : ${name}       (${transcriptLength} deliveries)`);
  }
  for (const vatID of allDynamicVatIDs) {
    const transcriptLength = Number(get(`${vatID}.t.nextID`));
    console.log(
      `${vatID} : (dynamic)`,
      get(`${vatID}.options`),
      `   (${transcriptLength} deliveries)`,
    );
  }
} else {
  let vatID = vatName;
  if (allVatNames.indexOf(vatName) !== -1) {
    vatID = get(`vat.name.${vatName}`);
  }
  if (!get(`${vatID}.options`)) {
    throw Error(`unable to find vatID ${vatID}`);
  }
  console.log();
  const fn = `transcript-${vatID}.sst`;
  console.log(`extracting transcript for vat ${vatID} into ${fn}`);
  const fd = fs.openSync(fn, 'w');

  const dynamic = allDynamicVatIDs.includes(vatID);
  const source = JSON.parse(get(`${vatID}.source`));
  const vatSourceBundle = source.bundle || get(`bundle.${source.bundleName}`);
  const options = JSON.parse(get(`${vatID}.options`));
  console.log(`options:`, options);
  const { vatParameters } = options;
  console.log(`vatParameters:`, vatParameters);
  let transcriptNum = 0;
  const first = {
    type: 'create-vat',
    transcriptNum,
    vatID,
    dynamic,
    vatParameters,
    vatSourceBundle,
  };
  transcriptNum += 1;
  // first line of transcript is the source bundle
  fs.writeSync(fd, JSON.stringify(first));
  fs.writeSync(fd, '\n');

  const transcriptLength = Number(get(`${vatID}.t.nextID`));
  console.log(`${transcriptLength} transcript entries`);
  for (let i = 0; i < transcriptLength; i += 1) {
    const t = { transcriptNum, ...JSON.parse(get(`${vatID}.t.${i}`)) };
    transcriptNum += 1;
    // vatstoreGet can lack .response when key was missing
    // vatstoreSet has .response: null
    // console.log(`t.${i} : ${t}`);
    fs.writeSync(fd, `${JSON.stringify(t)}\n`);
  }
  fs.closeSync(fd);

  /*
  let c = new lmdb.Cursor(txn, dbi);
  let key = c.goToFirst();
  while(0) {
    //console.log(key);
    console.log(key, txn.getString(dbi, key));
    key = c.goToNext();
    if (!key) {
      break;
    }
  }
*/
}
