#!/usr/bin/env node
/** @file make an owner multisig from multiple ledger hd paths */
// XXX just use public keys instead of on-line ledger interaction???
import { $ } from 'execa';

const config = {
  // Ledger support in Cosmos SDK talks to the Ledger Cosmos app.
  coinType: 118,
  multisigName: 'ymax1-ms',
  threshold: 2,
  // With `--ledger`, `agd` accepts `--account` / `--index`, not `--hd-path`.
  members: [
    { name: 'ymax1-ledger-30', account: 3, index: 0 },
    { name: 'ymax1-ledger-31', account: 3, index: 1 },
  ],
  // `agd` defaults to the `os` keyring backend, which is what we want here.
};
const flags = record =>
  Object.entries(record).flatMap(([key, value]) =>
    value === true ? [`--${key}`] : [`--${key}`, value],
  );

const $x = $({ env: process.env, stdio: 'pipe' });
const $q = $x({ stdio: 'ignore' });
const $i = $x({ stdio: 'inherit' });
const fromJson = async p => JSON.parse((await p).stdout);

const unless = async (condition, action) => {
  const k = x => () => x;
  const done = await condition.then(k(true), k(false));
  if (done) return;

  await action();
};

const main = async ({ stdout } = process) => {
  for (const { name, account, index } of config.members) {
    await unless(
      $q`agd keys show ${name}`,
      () =>
        $i`agd keys add ${name} ${flags({ ledger: true, 'coin-type': config.coinType, account, index })}`,
    );
  }

  const multisig = config.members.map(({ name }) => name).join(',');
  await $i`agd keys add ${config.multisigName} ${flags({ multisig, 'multisig-threshold': config.threshold })}`;

  const record = await fromJson(
    $x`agd keys show ${config.multisigName} --output json`,
  );
  stdout.write(`${JSON.stringify(record, null, 2)}\n`);
};

main().catch(err => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('failed to generate ledger key')) {
    process.stderr.write(
      'Make sure the Ledger Cosmos app is open and approve the address export on-device.\n',
    );
  }
  process.stderr.write(`${message}\n`);
  process.exit(1);
});
