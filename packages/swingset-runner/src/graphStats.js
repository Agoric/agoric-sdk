#!/usr/bin/env node

import { dataGraphApp } from './dataGraphApp.js';

export const main = async () => {
  // prettier-ignore
  await dataGraphApp(
    'block',
    'Block #',
    null,
    'Count',
    null,
  );
};

main();
