import '@agoric/install-ses';

import { setBundle } from './bundle-functions.js';
import { vatSourceBundle } from './vatSourceBundle.js';

async function run() {
  await setBundle(vatSourceBundle, {});
  console.log(`did setBundle`);
}

run();
