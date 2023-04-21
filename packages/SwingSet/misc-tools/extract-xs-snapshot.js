// @ts-check

import '@endo/init';
import process from 'process';
import fs from 'fs';
import { isSwingStore, openSwingStore } from '@agoric/swing-store';

const argv = process.argv.splice(2);
const dirPath = argv[0];
const vatIDToExtract = argv[1];

if (!dirPath) {
  console.log('extract-snapshot DBDIR : list all snapshots in DB');
  console.log('extract-snapshot DBDIR vatID : extract latest snapshot');
  process.exit(0);
}

if (!isSwingStore(dirPath)) {
  throw Error(
    `${dirPath} does not appear to be a swingstore (no ./swingstore.sqlite)`,
  );
}

const {
  kernelStorage: { kvStore },
  internal: { snapStore },
} = openSwingStore(dirPath);

if (!vatIDToExtract) {
  const allVatNames = JSON.parse(kvStore.get('vat.names'));
  const namedVats = new Map(
    allVatNames.map(name => [kvStore.get(`vat.name.${name}`), name]),
  );
  const h = `all snapshots:                 pos    hash       compressed    raw`;
  console.warn(h);
  for (const info of snapStore.listAllSnapshots()) {
    const { vatID, inUse, endPos, hash } = info;
    const name = namedVats.get(vatID) || '?';
    const used = inUse ? 'used' : 'old';
    const sVatID = vatID.padEnd(3);
    const sName = name.padEnd(15);
    const sUsed = used.padStart(4);
    const sPos = endPos.toString().padStart(6);
    const sHash = `${hash.slice(0, 10)}..`;
    const sCompressed = info.compressedSize.toString().padStart(7);
    const sRaw = info.uncompressedSize.toString().padStart(8);
    console.log(
      `${sVatID}  : ${sName} ${sUsed}  ${sPos}-  ${sHash}  ${sCompressed} ${sRaw}`,
    );
  }
} else {
  const info = snapStore.getSnapshotInfo(vatIDToExtract);
  const { endPos, hash } = info;
  const write = async tmpFilePath => {
    const snapshot = fs.readFileSync(tmpFilePath);
    const fn = `${vatIDToExtract}-${endPos}-${hash}.xss`;
    fs.writeFileSync(fn, snapshot);
    console.log(`wrote snapshot to ${fn}`);
  };
  snapStore.loadSnapshot(vatIDToExtract, write);
}
