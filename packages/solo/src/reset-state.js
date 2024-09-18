import { initSwingStore } from '@agoric/swing-store';
import fs from 'fs';
import path from 'path';

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
