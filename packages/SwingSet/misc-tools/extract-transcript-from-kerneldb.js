import '@endo/init';
import process from 'process';
import fs from 'fs';
import { isSwingStore, openSwingStore } from '@agoric/swing-store';

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

if (!isSwingStore(dirPath)) {
  throw Error(`${dirPath} does not appear to be a swingstore (no ./data.mdb)`);
}
const { kvStore, transcriptStore } = openSwingStore(dirPath).kernelStorage;
function get(key) {
  return kvStore.get(key);
}

const allVatNames = JSON.parse(get('vat.names'));
const allDynamicVatIDs = JSON.parse(get('vat.dynamicIDs'));

if (!vatName) {
  console.log(`all vats:`);
  for (const name of allVatNames) {
    const vatID = get(`vat.name.${name}`);
    const startPos = Number(get(`${vatID}.t.startPosition`));
    const endPos = Number(get(`${vatID}.t.endPosition`));
    const len = `${endPos - startPos}`;
    const status = `(static)`;
    console.log(
      `${vatID.padEnd(3)} : ${name.padEnd(15)} ${status.padEnd(
        20,
      )} ${len.padStart(10)} deliveries`,
    );
  }
  for (const vatID of allDynamicVatIDs) {
    const startPos = Number(get(`${vatID}.t.startPosition`));
    const endPos = Number(get(`${vatID}.t.endPosition`));
    const len = `${endPos - startPos}`;
    const options = JSON.parse(get(`${vatID}.options`));
    const { name, managerType } = options;
    const status = `(dynamic, ${managerType})`;
    console.log(
      `${vatID.padEnd(3)} : ${name.padEnd(15)} ${status.padEnd(
        20,
      )} ${len.padStart(10)} deliveries`,
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
  let vatSourceBundle;
  if (source.bundleID) {
    console.log(`source bundleID: ${source.bundleID}`);
    vatSourceBundle = JSON.parse(get(`bundle.${source.bundleID}`));
  } else {
    // this doesn't actually happen, now that Zoe launches ZCF by bundlecap
    vatSourceBundle = JSON.parse(source.bundle);
    const { moduleFormat, endoZipBase64 } = vatSourceBundle;
    console.log(
      `source is bundle, format=${moduleFormat}, endoZipBase64.length=${endoZipBase64.length}`,
    );
  }
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

  // The transcriptStore holds concatenated transcripts from all upgraded
  // versions. For each old version, it holds every delivery from
  // `startVat` through `stopVat`. For the current version, it holds
  // every delivery from `startVat` up through the last delivery
  // attempted, which might include one or more deliveries that have
  // been rewound (either because a single crank was abandoned, or the
  // host application failed to commit the kvStore).
  //
  // The kvStore `${vatID}.t.startPosition` tells us the index of the
  // first entry of the most recent version (the most recent
  // `startVat`), while `${vatID}.t.endPosition` tells us the last
  // committed entry.
  //
  // We ignore the heap snapshot ID, because we're deliberately
  // replaying everything from `startVat`, and therefore we also
  // ignore `snapshot.startPos` (the index of the first delivery
  // *after* the snapshot was taken, where normal operation would
  // start a replay).

  const startPos = Number(get(`${vatID}.t.startPosition`));
  const endPos = Number(get(`${vatID}.t.endPosition`));
  const transcriptLength = endPos - startPos;
  console.log(`${transcriptLength} transcript entries`);

  let deliveryNum = 0;
  const transcript = transcriptStore.readSpan(vatID, startPos, endPos);
  for (const entry of transcript) {
    // entry is JSON.stringify({ d, syscalls }), syscall is { d, response }
    const t = { transcriptNum, ...JSON.parse(entry) };
    // console.log(`t.${deliveryNum} : ${t}`);
    fs.writeSync(fd, `${JSON.stringify(t)}\n`);
    // eslint-disable-next-line no-unused-vars
    deliveryNum += 1;
    transcriptNum += 1;
  }

  fs.closeSync(fd);
  console.log(`wrote ${transcriptNum} entries for vat ${vatID} into ${fn}`);
}
