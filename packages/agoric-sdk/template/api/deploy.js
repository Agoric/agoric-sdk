// Agoric Dapp api deployment script
import fs from 'fs';
import harden from '@agoric/harden';

export default async function deployApi(homeP, { bundleSource, pathResolve }) {
  const { source, moduleFormat } = await bundleSource('./handler.js');
  const handlerInstall = homeP~.spawner~.install(source, moduleFormat);
  const handler = handlerInstall~.spawn();
  await homeP~.http~.registerCommandHandler(handler);
}
