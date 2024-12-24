#!/usr/bin/env node
import '@endo/init/debug.js';
import { agops, GOV1ADDR, GOV2ADDR } from '@agoric/synthetic-chain';
import { GOV4ADDR } from './agoric-tools.js';

// New GOV4 account to be added
const addresses = [GOV1ADDR, GOV2ADDR, GOV4ADDR];

await Promise.all(
  addresses.map((addr, idx) =>
    agops.ec('committee', '--send-from', addr, '--voter', `${idx}`),
  ),
);

await Promise.all(
  addresses.map(addr =>
    agops.ec('charter', '--send-from', addr, '--name', 'econCommitteeCharter'),
  ),
);
