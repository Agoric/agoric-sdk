// @ts-check
import processPowers from 'process';
import fsPowers from 'fs';
import '@agoric/install-ses';
import { openSwingStore } from '@agoric/swing-store';

const Usage = `
extract-transcript-from-kerneldb DBDIR : list all vats in DB
extract-transcript-from-kerneldb DBDIR VATID|VatName : extract transcript
`;

/**
 * @param {string[]} allVatNames
 * @param {(k: string) => string | undefined} get
 * @param {string[]} allDynamicVatIDs
 */
function listAllVats(allVatNames, get, allDynamicVatIDs) {
  const itemCount = value => JSON.parse(value).itemCount;
  console.log(`all vats:`);
  for (const name of allVatNames) {
    const vatID = get(`vat.name.${name}`);
    const transcriptLength = itemCount(get(`${vatID}.t.endPosition`));
    console.log(`${vatID} : ${name}       (${transcriptLength} deliveries)`);
  }
  for (const vatID of allDynamicVatIDs) {
    const transcriptLength = itemCount(get(`${vatID}.t.endPosition`));
    console.log(
      `${vatID} : (dynamic)`,
      get(`${vatID}.options`),
      `   (${transcriptLength} deliveries)`,
    );
  }
}

/**
 *
 * @param { KVStore } kvStore
 * @param { StreamStore } streamStore
 * @param { string } vatName
 * @param { string[] } allVatNames
 * @param { string[] } allDynamicVatIDs
 * @param {{ fs: typeof import('fs') }} io
 *
 * @typedef { import('@agoric/swing-store-lmdb').KVStore } KVStore
 * @typedef { import('@agoric/swing-store-lmdb').StreamStore } StreamStore
 */
function extractTranscript(
  kvStore,
  streamStore,
  vatName,
  allVatNames,
  allDynamicVatIDs,
  { fs },
) {
  const get = kvStore.get;
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

  const itemCount = value => JSON.parse(value).itemCount;
  const transcriptLength = itemCount(get(`${vatID}.t.endPosition`));
  console.log(`${transcriptLength} transcript entries`);

  const endPos = JSON.parse(get(`${vatID}.t.endPosition`));
  for (const entry of streamStore.readStream(
    `transcript-${vatID}`,
    streamStore.STREAM_START,
    endPos,
  )) {
    // vatstoreGet can lack .response when key was missing
    // vatstoreSet has .response: null
    // console.log(`t.${i} : ${t}`);
    fs.writeSync(fd, `${entry}\n`);
  }
  fs.closeSync(fd);
}

/**
 * @param { string[] } argv
 * @param {{ fs: typeof import('fs') }} io
 */
async function main(argv, { fs }) {
  const [dirPath, vatName] = argv;

  if (!dirPath) {
    console.error(Usage);
    return 1;
  }

  const { kvStore, streamStore } = openSwingStore(dirPath);

  function get(key) {
    return kvStore.get(key);
  }

  const allVatNames = JSON.parse(get('vat.names'));
  const allDynamicVatIDs = JSON.parse(get('vat.dynamicIDs'));

  if (!vatName) {
    listAllVats(allVatNames, get, allDynamicVatIDs);
  } else {
    extractTranscript(
      kvStore,
      streamStore,
      vatName,
      allVatNames,
      allDynamicVatIDs,
      { fs },
    );
  }
  return 0;
}

Promise.resolve()
  .then(() => main(processPowers.argv.slice(2), { fs: fsPowers }))
  .then(code => processPowers.exit(code))
  .catch(err => console.error(err));
