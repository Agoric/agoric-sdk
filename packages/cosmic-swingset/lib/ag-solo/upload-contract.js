// In the future, this javascript source file will use the "tildot"
// syntax (foo~.bar()) for eventual sends.
// https://agoric.com/documentation/ertp/guide/other-concepts.html
// Tildot is standards track with TC39, the JavaScript standards
// committee. https://github.com/tc39/proposal-wavy-dot

import { E } from '@agoric/eventual-send';

import { assert, details as X } from '@agoric/assert';

export default async function uploadContracts({ home, bundle }) {
  console.error(`Installing targeted contracts...`);
  // eslint-disable-next-line no-use-before-define
  await upload(
    home,
    bundle,
    Object.keys(bundle)
      .filter(k => k !== 'main')
      .sort(),
    true,
  );
}

export async function upload(homeP, bundle, keys, verbose = false) {
  const names = [];
  const contractsAP = [];
  for (const key of keys) {
    const match = key.match(/^(([^:]+):.+)$/);
    assert(match, X`${key} isn't TARGET:NAME`);
    const name = match[1];
    const target = match[2];
    const { source, moduleFormat } = bundle[key];
    // console.error(`Uploading ${source}`);

    // eslint-disable-next-line no-await-in-loop
    const targetObj = await E(homeP)[target];
    if (!targetObj) {
      console.error(
        `Contract installation target object ${target} is not available for ${name}; skipping...`,
      );
    } else {
      // Install the contract, then save it in home.uploads.
      if (verbose) {
        console.debug(name);
      }
      contractsAP.push(E(targetObj).install(source, moduleFormat));
      names.push(name);
    }
  }

  const uploadsP = E(homeP).uploads;
  const contracts = await Promise.all(contractsAP);
  for (let i = 0; i < contracts.length; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    await E(uploadsP).set(names[i], contracts[i]);
  }

  console.error('See home.uploads~.list()');
}
