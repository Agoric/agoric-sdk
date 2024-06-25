#!/usr/bin/env node
import process from 'node:process';
import { parseArgs } from 'node:util';
import { execa } from 'execa';

const BINARY = process.env.binary || 'agd';

const usage = `Usage:
agd-add-offline-key.js <name> <address> [flags]
  Add public key of <address> to as an offline key saved under <name>

Keys Flags:
      --dry-run                  Perform action, but don't add key to local keystore
      --keyring-backend string   Select keyring's backend (os|file|test) (default "os")
      --keyring-dir string       The client Keyring directory; if omitted, the default 'home' directory will be used
      --output string            Output format (text|json) (default "text")

Query Flags:
      --node string              <host>:<port> to Tendermint RPC interface for this chain (default "tcp://localhost:26657")

Global Flags:
      --home string              The application home directory (default "/home/node/.agoric")
       -h, --help                help
`;

const args = parseArgs({
  allowPositionals: true,
  options: {
    help: { type: 'boolean', short: 'h' },
    home: { type: 'string' },
    node: { type: 'string' },
    output: { type: 'string' },
    'keyring-dir': { type: 'string' },
    'keyring-backend': { type: 'string' },
    'dry-run': { type: 'boolean' },
  },
});

if (args.values.help) {
  console.log(usage);
  process.exit();
}

if (args.positionals.length !== 2) {
  console.error(usage);
  process.exit(1);
}

const queryOptions = ['home', 'node'];
const keysOptions = [
  'home',
  'dry-run',
  'keyring-backend',
  'keyring-dir',
  'output',
];

for (const options of [queryOptions, keysOptions]) {
  const optionNames = options.splice(0);

  for (const name of optionNames) {
    if (name in args.values) {
      options.push(`--${name}`);
      const value = args.values[name];
      if (typeof value === 'string') {
        options.push(value);
      }
    }
  }
}

const { stdout: queryOutput } = await execa(BINARY, [
  'query',
  'account',
  args.positionals[1],
  ...queryOptions,
  '--output',
  'json',
]);

const { pub_key: pubKey } = JSON.parse(queryOutput);

await execa(
  BINARY,
  [
    'keys',
    'add',
    args.positionals[0],
    '--pubkey',
    JSON.stringify(pubKey),
    ...keysOptions,
  ],
  { stdout: 'inherit', stderr: 'inherit' },
);
