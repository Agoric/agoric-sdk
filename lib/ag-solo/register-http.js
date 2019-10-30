export default async function registerHttp({ home, bundle }) {
  console.error(`Upgrading Dapp handlers...`);
  await register(home, bundle, Object.keys(bundle).filter(k => k !== 'main').sort());
}

export async function register(homeP, bundle, keys) {
  const targetObj = await homeP~.http;
  if (!targetObj) {
    throw Error(`HTTP registration object not available`);
  }
  await Promise.all(keys.map(key => {
    const { source, moduleFormat } = bundle[key];
    // console.error(`Uploading ${source}`);

    // Register the HTTP handler.
    contractsAP.push(targetObj~.register(key, source, moduleFormat));
  }));
}
