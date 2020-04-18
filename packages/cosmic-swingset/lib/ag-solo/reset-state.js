import path from 'path';
import fs from 'fs';

import { getBestSwingStore } from '../check-lmdb';

export default async function resetState(basedir) {
  const mailboxStateFile = path.resolve(
    basedir,
    'swingset-kernel-mailbox.json',
  );
  fs.writeFileSync(mailboxStateFile, `{}\n`);
  const kernelStateDBDir = path.join(basedir, 'swingset-kernel-state');
  const tempdir = path.resolve(basedir, 'check-lmdb-tempdir');
  const { initSwingStore } = getBestSwingStore(tempdir);
  const { commit, close } = initSwingStore(kernelStateDBDir);
  commit();
  close();
}
