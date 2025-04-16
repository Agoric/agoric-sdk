/** @import { VStorage } from '@agoric/client-utils' */

export const queryFastUSDCLocalChainAccount = async (
  /** @type {VStorage} */ vstorage,
  out = console,
) => {
  const { value } = await vstorage.readLatest('published.fastUsdc');
  const { settlementAccount } = JSON.parse(JSON.parse(value).values[0]);
  out.log(`settlementAccount: ${settlementAccount}`);
  return settlementAccount;
};
