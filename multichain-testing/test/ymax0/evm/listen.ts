import { ethers } from 'ethers';

// - Do a NOBLE CCTP transfer
// - Inspect the logs of the wallet

const wait = async (seconds: number) => {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
};
