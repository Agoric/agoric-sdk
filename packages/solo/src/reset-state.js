import path from 'path';
import fs from 'fs';

import { initSwingStore } from '@agoric/swing-store';

export default async function resetState(basedir) {
  const mailboxStateFile = path.resolve(
    basedir,
    'swingset-kernel-mailbox.json',
  );
  fs.writeFileSync(mailboxStateFile, `{}\n`);
  const kernelStateDBDir = path.join(basedir, 'swingset-kernel-state');
  const { commit, close } = initSwingStore(kernelStateDBDir).hostStorage;
  await commit();
  await close();
}
