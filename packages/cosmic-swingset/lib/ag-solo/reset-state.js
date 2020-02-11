import path from 'path';
import fs from 'fs';

export default async function resetState(basedir) {
  const mailboxStateFile = path.resolve(basedir, 'swingset-kernel-mailbox.json');
  fs.writeFileSync(mailboxStateFile, `{}\n`);
  const kernelStateFile = path.resolve(
    basedir,
    'swingset-kernel-state.jsonlines',
  );
  // this contains newline-terminated lines of JSON.stringify(['key', 'value'])
  fs.writeFileSync(kernelStateFile, ``);
}
