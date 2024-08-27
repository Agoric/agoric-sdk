#!/usr/bin/env node
/* eslint-env node */
import { writeFile } from 'fs/promises';
import { getInstanceBoardId } from '@agoric/synthetic-chain';
import assert from 'node:assert/strict';

const { env } = process;

const oldAuctionInstance = await getInstanceBoardId('auctioneer');
assert(oldAuctionInstance, 'no auction instance found');
console.log('old auction instance ', oldAuctionInstance, env.HOME);

await writeFile(
  `${env.HOME}/.agoric/previousInstance.json`,
  oldAuctionInstance,
);
