import test from 'ava';

import { promises as fs } from 'fs';

import {
  agd,
  agoric,
  agops,
} from '@agoric/synthetic-chain/src/lib/cliHelper.js';

import {
  GOV1ADDR,
  GOV2ADDR,
  GOV3ADDR,
  PSM_PAIR,
} from '@agoric/synthetic-chain/src/lib/constants.js';
import { openVault } from '@agoric/synthetic-chain/src/lib/econHelpers.js';
import {
  getUser,
  waitForBlock,
} from '@agoric/synthetic-chain/src/lib/commonUpgradeHelpers.js';

test.before(async () => {
  console.log('Wait for upgrade to settle');

  await waitForBlock(20);
});
