export default async function uploadContracts({ home, bundle }) {
  console.error(`Installing targeted contracts...`);
  await upload(home, bundle, Object.keys(bundle).filter(k => k !== 'main').sort(), true);
}

export async function upload(homeP, bundle, keys, verbose = false) {
  const names = [];
  const contractsAP = [];
  for (const key of keys) {
    const match = key.match(/^(([^:]+):.+)$/);
    if (!match) {
      throw Error(`${key} isn't TARGET:NAME`);
    }
    const name = match[1];
    const target = match[2];
    const { source, moduleFormat } = bundle[key];
    // console.error(`Uploading ${source}`);

    const targetObj = await homeP~.[target];
    if (!targetObj) {
      console.error(
        `Contract installation target object ${target} is not available for ${name}; skipping...`,
      );
    } else {
      // Install the contract, then save it in home.uploads.
      if (verbose) {
        console.log(name);
      }
      contractsAP.push(targetObj~.install(source, moduleFormat));
      names.push(name);
    }
  }

  const uploadsP = homeP~.uploads;
  const contracts = await Promise.all(contractsAP);
  for (let i = 0; i < contracts.length; i ++) {
    await uploadsP~.set(names[i], contracts[i]);
  }

  console.error('See home.uploads~.list()');
}
