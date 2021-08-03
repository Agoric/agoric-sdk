#!/usr/bin/env -S node -r esm

import { dataGraphApp } from './dataGraphApp.js';

export async function main() {
  // prettier-ignore
  await dataGraphApp(
    'block',
    'Block #',
    'rss',
    'Memory usage',
    ['rss', 'heapTotal', 'heapUsed', 'external'],
  );
}

main();
