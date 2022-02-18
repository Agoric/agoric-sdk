#!/usr/bin/env node

import { dataGraphApp } from './dataGraphApp.js';

export const main = async () => {
  // prettier-ignore
  await dataGraphApp(
    'block',
    'Block #',
    'btime',
    'Block time (ns)',
    ['btime'],
  );
};

main();
