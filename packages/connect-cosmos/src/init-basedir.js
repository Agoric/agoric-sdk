// @ts-check
/* global Buffer globalThis */
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

import { E } from '@agoric/eventual-send';

import { makeUser } from './user';

export const MNEMONIC_ENTROPY_BITS = 256;

const makeDefaultUser = powers => {
  const user = makeUser(powers);
  return harden({
    ...user,
    async notifyMnemonic(_user, _mnemonic) {
      // FIXME: We don't know how to recover a user's mnemonic, so we don't even
      // notify of generating a new one.
    },
  });
};

// we assume 'ag-cosmos-helper' is on $PATH for now, see make-deliver.js
export async function initBasedir({ basedir, keyName = 'ag-solo' }, powers) {
  const {
    console = globalThis.console,
    user = makeDefaultUser({ console }),
  } = powers;

  const agchAddress = path.join(basedir, 'ag-cosmos-helper-address');
  if (fs.existsSync(agchAddress)) {
    return;
  }

  const agchServerDir = path.join(basedir, 'ag-cosmos-helper-statedir');
  fs.mkdirSync(agchServerDir);

  const mnemonic = await E(user).recoverOrGenerateMnemonic(
    user,
    MNEMONIC_ENTROPY_BITS,
  );

  execFileSync(
    'ag-cosmos-helper',
    [
      'keys',
      'add',
      keyName,
      '--recover',
      '--no-backup', // Don't display the mnemonic phrase.
      '--keyring-backend=test',
      '--home',
      agchServerDir,
    ],
    {
      input: Buffer.from(`${mnemonic}\n`),
      stdio: ['pipe', 'ignore', 'inherit'],
    },
  );

  console.log('key generated, now extracting address');
  const kout = execFileSync(
    'ag-cosmos-helper',
    [
      'keys',
      'show',
      '--keyring-backend=test',
      keyName,
      '--address',
      '--home',
      agchServerDir,
    ],
    {
      input: Buffer.from(''),
      stdio: ['pipe', 'pipe', 'inherit'],
    },
  );
  fs.writeFileSync(`${agchAddress}T`, kout.toString());
  fs.renameSync(`${agchAddress}T`, agchAddress);
}
