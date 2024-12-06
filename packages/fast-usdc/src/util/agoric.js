/** @import { VStorage } from '@agoric/client-utils' */

export const queryFastUSDCLocalChainAccount = async (
  /** @type {VStorage} */ vstorage,
  out = console,
) => {
  const agoricAddr = await vstorage.readLatest(
    'published.fastUsdc.settlementAccount',
  );
  out.log(`Got Fast USDC Local Chain Account ${agoricAddr}`);
  return agoricAddr;
};
