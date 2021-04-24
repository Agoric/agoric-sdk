import fs from 'fs';
import {
  openSwingStore as openSwingStoreLMDB,
  initSwingStore as initSwingStoreLMDB,
} from '@agoric/swing-store-lmdb';
import {
  openSwingStore as openSwingStoreSimple,
  initSwingStore as initSwingStoreSimple,
} from '@agoric/swing-store-simple';

import { assert, details as X } from '@agoric/assert';

/*
 * Return an 'openSwingStore' function for the best kind of DB that works on
 * this platform. This will be LMDB if possible, else Simple.
 *
 * This function will (briefly) create a new directory in 'tempdir' (which
 * must not previously exist) to test LMDB.
 *
 */

export function getBestSwingStore(tempdir) {
  // if tempdir already exists, bail immediately so we don't accidentally
  // clobber it later
  if (fs.existsSync(tempdir)) {
    throw Error(
      `getBestSwingStore must be given a non-existing tempdir, not ${tempdir}`,
    );
  }

  try {
    const tdb1 = openSwingStoreLMDB(tempdir);
    tdb1.storage.set('test key', 'test value');
    tdb1.commit();
    tdb1.close();

    const tdb2 = openSwingStoreLMDB(tempdir);
    assert(tdb2.storage.has('test key'), X`LMDB test disavows test key`);
    const val = tdb2.storage.get('test key');
    assert(
      val === 'test value',
      X`LMDB test returned '${val}', not 'test value'`,
    );
    tdb2.close();
    // if we made it this far, LMDB works
    return {
      openSwingStore: openSwingStoreLMDB,
      initSwingStore: initSwingStoreLMDB,
    };
  } catch (e) {
    console.log(`LMDB does not work, falling back to Simple DB`, e);
    // see https://github.com/Agoric/agoric-sdk/issues/950 for details
    return {
      openSwingStore: openSwingStoreSimple,
      initSwingStore: initSwingStoreSimple,
    };
  } finally {
    fs.rmdirSync(tempdir, { recursive: true });
  }
}
