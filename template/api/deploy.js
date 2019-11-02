// Agoric Dapp api deployment script
export default async function deployApi(homeP, { bundleSource }) {
  const { source, moduleFormat } = await bundleSource('./handler.js');
  const handlerInstall = homeP~.spawner~.install(source, moduleFormat);
  handlerInstall~.spawn(homeP);
  homeP~.registerCommandHandler(handler);
}
