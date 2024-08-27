#!/usr/bin/env node

import { writeFile } from 'fs/promises';
import { getInstanceBoardId } from './agd-tools.js';

const { env } = process;

const oldAuctionInstance = await getInstanceBoardId('auctioneer');
console.log('old auction instance ', oldAuctionInstance, env.HOME);

const filePath = `${env.HOME}/.agoric/tmp/auctionPreviousInstance.json`;

await writeFile(filePath, oldAuctionInstance);
