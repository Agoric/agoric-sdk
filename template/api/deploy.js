// Agoric Dapp api deployment script
export default async function deployApi(homeP, { bundleSource }) {
  await { source, moduleFormat } = await bundleSource('./handler.js');
  const handler = homeP~.spawner~.install(source, moduleFormat);
  homeP~.registerCommandHandler(handler);
}
