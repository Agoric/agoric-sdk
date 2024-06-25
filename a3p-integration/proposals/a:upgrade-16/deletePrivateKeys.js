#!/usr/bin/env node
/* global process */

import { execa } from 'execa';

const BINARY = process.env.binary || 'agd';

const { stdout: keysOutput } = await execa(BINARY, [
  'keys',
  '--keyring-backend=test',
  'list',
  '--output',
  'json',
]);

for await (const { name, type, pubkey } of JSON.parse(keysOutput)) {
  if (type !== 'local') continue;
  await execa(
    BINARY,
    ['keys', '--keyring-backend=test', 'delete', name, '--force', '--yes'],
    {
      stdout: 'inherit',
      stderr: 'inherit',
    },
  );
  await execa(
    BINARY,
    ['keys', '--keyring-backend=test', 'add', name, '--pubkey', pubkey],
    {
      stdout: 'inherit',
      stderr: 'inherit',
    },
  );
}
