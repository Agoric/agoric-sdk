#!/usr/bin/env node

import { agops, GOV1ADDR } from '@agoric/synthetic-chain';

await agops.ec('committee', '--send-from', GOV1ADDR);
await agops.ec(
  'charter',
  '--send-from',
  GOV1ADDR,
  '--name',
  'econCommitteeCharter',
);
