#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { getAuctionInstance } from './agd-tools.js';

const { env } = process;

const oldAuctionInstance = await getAuctionInstance();
console.log('old auction instance ', oldAuctionInstance, env.HOME);

await writeFile(
  `${env.HOME}/.agoric/previousInstance.json`,
  oldAuctionInstance,
);
