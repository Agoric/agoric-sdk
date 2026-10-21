#!/usr/bin/env node
/** @file create the ymax1 test ops multisig in the agd test keyring */
import { pathToFileURL } from 'node:url';
import { $ } from 'execa';

const config = {
  keyName: 'ymax1-ops-ms',
  threshold: 2,
  members: [
    { name: 'ymax1-ops-1', mnemonic: `${'abandon '.repeat(11)}about` },
    { name: 'ymax1-ops-2', mnemonic: `${'zoo '.repeat(11)}wrong` },
    { name: 'ymax1-ops-3', mnemonic: `${'abandon '.repeat(10)}able bus` },
    { name: 'ymax1-ops-4', mnemonic: `${'abandon '.repeat(10)}able toe` },
    { name: 'ymax1-ops-5', mnemonic: `${'abandon '.repeat(10)}acid fox` },
  ],
};
const testKeys = { 'keyring-backend': 'test' };
const jsonOut = { output: 'json' };
const fromJson = async p => JSON.parse((await p).stdout);
const flags = record =>
  Object.entries(record).flatMap(([key, value]) =>
    value === true ? [`--${key}`] : value ? [`--${key}`, value] : [],
  );

const $x = $({ env: process.env, stdio: 'pipe' });
const $q = $x({ stdio: 'ignore' });
const $i = $x({ stdio: 'inherit', verbose: 'short' });

const unless = async (condition, action) => {
  const k = x => () => x;
  const done = await condition.then(k(true), k(false));
  if (done) return;

  await action();
};

const main = async () => {
  for (const { name, mnemonic } of config.members) {
    const input = `${mnemonic}\n`;
    await unless(
      $q`agd keys show ${name} ${flags(testKeys)}`,
      () => $i({ input })`agd keys add ${name} --recover ${flags(testKeys)}`,
    );
  }

  const multisig = config.members.map(({ name }) => name).join(',');
  await unless(
    $q`agd keys show ${config.keyName} ${flags(testKeys)}`,
    () =>
      $i`agd keys add ${config.keyName} ${flags({
        multisig,
        'multisig-threshold': config.threshold,
        ...jsonOut,
      })} ${flags(testKeys)}`,
  );

  const record = await fromJson(
    $x`agd keys show ${config.keyName} ${flags({ ...jsonOut, ...testKeys })}`,
  );
  process.stdout.write(`${JSON.stringify(record, null, 2)}\n`);
};

export { config, main };

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch(err => {
    const message = err instanceof Error ? err.message : String(err);
    process.stderr.write(`${message}\n`);
    process.exit(1);
  });
}
