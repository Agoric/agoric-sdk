import path from 'path';
import fs from 'fs';

import { makeSimpleSwingStore } from '@agoric/swing-store-simple';

export default async function resetState(basedir) {
  const mailboxStateFile = path.resolve(basedir, 'swingset-kernel-mailbox.json');
  fs.writeFileSync(mailboxStateFile, `{}\n`);

  const { commit, close } = makeSimpleSwingStore(basedir, 'swingset-kernel-state', true);
  commit();
  close();
}
