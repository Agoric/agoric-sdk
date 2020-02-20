import path from 'path';
import fs from 'fs';

import { makeSwingStore } from '@agoric/swing-store-simple';

export default async function resetState(basedir) {
  const mailboxStateFile = path.resolve(basedir, 'swingset-kernel-mailbox.json');
  fs.writeFileSync(mailboxStateFile, `{}\n`);
  const kernelStateDBDir = path.join(basedir, 'swingset-kernel-state');
  const { commit, close } = makeSwingStore(kernelStateDBDir, true);
  commit();
  close();
}
