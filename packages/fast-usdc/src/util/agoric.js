// import {
//   AgoricChainStoragePathKind,
//   makeAgoricChainStorageWatcher,
// } from '@agoric/rpc';

export const queryFastUSDCLocalChainAccount = (
  /** @type {string} */ agoricApi,
  out = console,
) => {
  // const watcher = makeAgoricChainStorageWatcher(agoricApi, 'agoric');
  // out.log('made watcher');
  // const agoricAddr = await watcher.queryOnce([
  //   AgoricChainStoragePathKind.Data,
  //   'published.fastUSDC.settlementAccount',
  // ]);
  // TODO: Find real vstorage path for settlement account address (above)

  const agoricAddr = 'agoric123456789';
  out.log(`Got Fast USDC Local Chain Account ${agoricAddr}`);
  return agoricAddr;
};
