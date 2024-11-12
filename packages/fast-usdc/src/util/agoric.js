/** @typedef {import('@agoric/client-utils').VStorage} VStorage */

export const queryFastUSDCLocalChainAccount = async (
  /** @type {VStorage} */ vstorage,
  out = console,
) => {
  const agoricAddr = await vstorage.readLatest(
    'published.fastUSDC.settlementAccount',
  );
  out.log(`Got Fast USDC Local Chain Account ${agoricAddr}`);
  return agoricAddr;
};
