#!/usr/bin/env node
// @ts-check

// #region ambient authority
import process from 'process';
import { $ } from 'zx';

const { env, argv: nodeArgv, exit } = process;
const echo = (...args) => console.log(...args);
// #endregion

// nodeArgv = ['node', 'smoketest', 'wallet']
// argv = ['smoketest', 'wallet']
const argv = nodeArgv.slice(1);

if (!env.AGORIC_NET) {
  echo('AGORIC_NET env not set');
  echo();
  echo('e.g. AGORIC_NET=ollinet (or export to save typing it each time)');
  echo();
  echo(`To test locally, AGORIC_NET=local and have the following running:
# freshen sdk
yarn install && yarn build

# local chain running with wallet provisioned
packages/inter-protocol/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY
`);
  exit(1);
}

const WALLET = argv[1];

if (!WALLET) {
  echo(`USAGE: ${argv[0]} key`);
  echo('You can reference by name: agd keys list');
  echo(
    'Make sure it has been provisioned by the faucet: https://$AGORIC_NET.faucet.agoric.net/',
  );
  exit(1);
}

// NB: fee percentages must be at least the governed param values

// NOTE: USDC_axl = ibc/usdt1234
// perf test wantMinted
let OFFER = await $`mktemp -t agops.XXX`;
await $`bin/agops psm swap --wantMinted 0.01 --feePct 0.01 --pair IST.USDC_axl >|${OFFER}`;
await $`time bin/agops perf satisfaction --executeOffer "$OFFER" --from ${WALLET} --keyring-backend="test"`;

// perf test giveMinted
OFFER = await $`mktemp -t agops.XXX`;
await $`bin/agops psm swap --giveMinted 0.01 --feePct 0.03 --pair IST.USDC_axl >|${OFFER}`;
await $`time bin/agops perf satisfaction --executeOffer ${OFFER} --from ${WALLET} --keyring-backend="test"`;
