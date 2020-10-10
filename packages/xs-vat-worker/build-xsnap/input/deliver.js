import { deliverAndVerifySyscalls } from './bundle-functions.js';

const delivery = 'REPLACE!ME';

async function run() {
  await deliverAndVerifySyscalls(delivery);
  console.log(`did deliverAndVerifySyscalls`);
}

run();
