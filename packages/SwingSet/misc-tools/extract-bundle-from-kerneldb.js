// @ts-check

import '@endo/init';
import process from 'process';
import fs from 'fs';
import { isSwingStore, openSwingStore } from '@agoric/swing-store';

const argv = process.argv.splice(2);
const dirPath = argv[0];
let bundleID = argv[1];

if (!dirPath) {
  console.log('extract-bundle-from-kerneldb DBDIR : list all bundles in DB');
  console.log(
    'extract-bundle-from-kerneldb DBDIR bundleID|vatID : extract bundle',
  );
  process.exit(0);
}

if (!isSwingStore(dirPath)) {
  throw Error(
    `${dirPath} does not appear to be a swingstore (no ./swingstore.sqlite)`,
  );
}

const {
  kernelStorage: { kvStore, bundleStore },
  internal: { bundleStore: bundleStoreInternal },
} = openSwingStore(dirPath);

if (!bundleID) {
  console.warn(`all bundles:`);
  for (const bundleId of bundleStoreInternal.getBundleIDs()) {
    console.log(`${bundleId}`);
  }
} else if (/(supervisor|lockdown)(B|-b)undle/.test(bundleID)) {
  const legacyBundleName = bundleID.replace('-bundle', 'Bundle');
  const bundle = kvStore.get(legacyBundleName);
  if (bundle === undefined) {
    throw Error(`Inexistent legacy bundle ${legacyBundleName}`);
  }
  fs.writeFileSync(bundleID.replace('Bundle', '-bundle'), bundle);
} else {
  const vatRawSource = kvStore.get(`${bundleID}.source`);

  if (vatRawSource) {
    const vatSource = JSON.parse(vatRawSource);
    if (vatSource.bundle) {
      const vatSourceBundle = JSON.parse(vatSource.bundle);
      const { moduleFormat, endoZipBase64 } = vatSourceBundle;
      console.warn(
        `vat ${bundleID} source is bundle, format=${moduleFormat}, endoZipBase64.length=${endoZipBase64.length}`,
      );
      fs.writeFileSync(`${bundleID}-bundle`, vatSource.bundle);
      process.exit(0);
    } else {
      console.warn(`vat ${bundleID} source is bundle ${vatSource.bundleID}`);
      bundleID = vatSource.bundleID;
      // fall-throuh
    }
  }

  const bundle = bundleStore.getBundle(bundleID);
  console.warn(`${bundleID} is ${bundle.moduleFormat} bundle`);
  fs.writeFileSync(`${bundleID}`, JSON.stringify(bundle));
}
