import harden from '@agoric/harden';
import { upload } from './upload-contract';

// Usage:
// ag-solo bundle -e init-autoswap zoe:autoswap=../node_modules/@agoric/ertp/core/zoe/contracts/autoswap.js

export default async ({ home, bundle }) => {
  // Install all the bundle entries that have a TARGET:NAME.
  // TARGET may be 'zoe' or 'contractHost' for example.
  const keyNames = Object.keys(bundle).sort().reduce((prior, key) => {
    const match = key.match(/^[^:]+:(.*)/);
    if (match) {
      prior.push([key, match[1]]);
    }
    return prior;
  }, []);
  await upload(home, bundle, keyNames.map(([k, n]) => k));

  // Register the installations.
  const nameIds = {};
  let autoswapKey;
  await Promise.all(keyNames.map(([k, n]) =>
    n === 'autoswap' ? autoswapKey = k : home~.uploads~.get(k).then(u => home~.registrar~.register(n, u))
    .then(id => nameIds[n] = id)));

  // TODO: This is just a sketch of how we might convert home.moolaMint into
  // funds for the autoswap instance.

  // Instantiate autoswap with some fresh moola and register the instance.
  if (autoswapKey) {
    const installHandle = await home~.uploads~.get(autoswapKey);
    const options = {
      assays: await Promise.all([home~.moolaMint~.getAssay()]),
      purses: await Promise.all([home~.moolaMint~.mint(100000)]),
    };
    const instance = home~.zoe~.makeInstance(installHandle, harden(options));
    nameIds['autoswap'] = await home~.registrar~.register('autoswap', instance);
  }

  // Output the record from contract IDs to registered names to stdout.
  console.log(JSON.stringify(nameIds, undefined, 2));
};
