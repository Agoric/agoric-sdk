/** @import { ChainStorageClient } from '@agoric/client-utils' */

export const queryFastUSDCLocalChainAccount = async (
  /** @type {ChainStorageClient} */ chainStorage,
  out = console,
) => {
  /** @type {import('@agoric/casting').StreamCell<import('../../types.ts').FastUSDCConfig>} */
  const cell = await chainStorage.readCell('published.fastUsdc');
  const { settlementAccount } = cell.values[0];
  out.log(`settlementAccount: ${settlementAccount}`);
  return settlementAccount;
};
