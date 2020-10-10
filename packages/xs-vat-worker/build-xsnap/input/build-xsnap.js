// this file is loaded at the start of a new subprocess

import { setBundle } from './bundle-functions.js';
import { vatSourceBundle } from './vatSourceBundle.js';

async function run() {
  await setBundle(vatSourceBundle, {});
  console.log(`did setBundle`);
}

run();
