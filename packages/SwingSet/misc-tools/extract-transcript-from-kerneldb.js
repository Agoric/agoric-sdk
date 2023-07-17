// @ts-nocheck

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
  throw Error(
    `${dirPath} does not appear to be a swingstore (no ./swingstore.sqlite)`,
  );
}

const {
  kernelStorage: { kvStore },
  internal: { transcriptStore },
} = openSwingStore(dirPath);
function get(key) {
  const value = kvStore.get(key);
  if (value === undefined) {
    throw Error(`Inexistent kvStore entry for ${key}`);
  }
  return value;
}

const allVatNames = JSON.parse(get('vat.names'));
const allDynamicVatIDs = JSON.parse(get('vat.dynamicIDs'));

if (!vatName) {
  console.log(`all vats:              status            startPos - endPos`);
  for (const name of allVatNames) {
    const vatID = get(`vat.name.${name}`);
    const status = `(static)`;
    const bounds = transcriptStore.getCurrentSpanBounds(vatID);
    const { startPos, endPos } = bounds;
    const boundsStr = `${startPos.toString().padStart(6)} - ${endPos
      .toString()
      .padStart(6)}`;
    console.log(
      `${vatID.padEnd(3)} : ${name.padEnd(15)} ${status.padEnd(
        20,
      )} ${boundsStr}`,
    );
  }
  for (const vatID of allDynamicVatIDs) {
    const options = JSON.parse(get(`${vatID}.options`));
    const { name, managerType } = options;
    const status = `(dynamic, ${managerType})`;
    console.log(`${vatID.padEnd(3)} : ${name.padEnd(15)} ${status.padEnd(20)}`);
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
  const vatSourceBundleID = source.bundleID;
  if (vatSourceBundleID) {
    console.log(`source bundleID: ${vatSourceBundleID}`);
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

  // This entry is only valid for the most recent incarnation of the vat
  const createVatEntry = {
    type: 'create-vat',
    transcriptNum: 0,
    vatID,
    vatName: options.name || vatName,
    dynamic,
    vatParameters,
    bundleIDs: options.workerOptions.bundleIDs,
    vatSourceBundleID,
    vatSourceBundle,
  };

  // The transcriptStore holds concatenated transcripts from all upgraded
  // versions. For each old version, it holds every delivery from
  // `startVat` through `stopVat`. For the current version, it holds
  // every delivery from `startVat` up through the last delivery
  // attempted, which might include one or more deliveries that have
  // been rewound (either because a single crank was abandoned, or the
  // host application failed to commit the kvStore).

  let transcriptNum = NaN;
  let startPosition = NaN;
  const transcript = transcriptStore.readFullVatTranscript(vatID);
  for (const { position, item } of transcript) {
    const entry = JSON.parse(item);
    // Reset the transcript every time we see `startVat` since we only support
    // the last incarnation and we have no way to get the transcript for just
    // that incarnation.
    if (entry.d[0] === 'startVat') {
      fs.ftruncateSync(fd);
      fs.writeSync(fd, `${JSON.stringify(createVatEntry)}\n`);
      transcriptNum = 1;
      startPosition = position;
    }

    // The transcript may have gotten pruned, and earlier deliveries may be
    // missing. Ignore anything until we've seen `startVat`.
    // Once the transcript includes snapshot load, we could relax this constraint.
    if (Number.isNaN(startPosition)) {
      continue;
    }

    const expectedPosition = startPosition + transcriptNum - 1;
    if (position !== expectedPosition) {
      throw Error(
        `Unexpected transcript item at position ${position} (expected to see item position ${expectedPosition})`,
      );
    }
    // item is JSON.stringify({ d, sc: syscalls, r }), syscall is { s, r }
    const t = { transcriptNum, ...JSON.parse(item) };
    fs.writeSync(fd, `${JSON.stringify(t)}\n`);
    transcriptNum += 1;
  }

  fs.closeSync(fd);
  console.log(
    `wrote ${transcriptNum || 0} entries for vat ${vatID} into ${fn}`,
  );
}
