/**
 * @file utils/contract-abis.js ABI encoding functions using @metamask/abi-utils
 */
import { ethers } from 'ethers';

export const aaveContractFns = {
  depositETH: (onBehalfOf, referralCode = 0) => {
    const abiCoder = new ethers.utils.AbiCoder();
    // TODO build this with code
    const functionSelector = '0x474cf53d'; // depositETH(address,address,uint16)

    const encodedArgs = abiCoder.encode(
      ['address', 'uint16'],
      [onBehalfOf, referralCode],
    );

    return { functionSelector, encodedArgs };
  },
  /**
   * not used for demo currently; might require 1) first wrapping native token
   * 2) permit/spend allowance for wrapped token
   *
   * @param asset
   * @param amount
   * @param onBehalfOf
   * @param referralCode
   */
  supply: (asset, amount, onBehalfOf, referralCode = 0) => {
    const abiCoder = new ethers.utils.AbiCoder();
    const functionSelector = '0x617ba037'; // supply(address,uint256,address,uint16)

    const encodedArgs = abiCoder.encode(
      ['address', 'uint256', 'address', 'uint16'],
      [asset, amount, onBehalfOf, referralCode],
    );

    return { functionSelector, encodedArgs };
  },
};
harden(aaveContractFns);

export const counterContractFns = {
  /** @param {number} newCount */
  setCount: newCount => {
    const abiCoder = new ethers.utils.AbiCoder();
    // TODO build this with code
    const functionSelector = '0x7ff36ab5'; // setCount(uint256)

    const encodedArgs = abiCoder.encode(['uint256'], [newCount]);

    return { functionSelector, encodedArgs };
  },
};
harden(counterContractFns);

export const ContractAddresses = {
  aaveV3: {
    avalanche: '0xTODO',
    ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  },
  counter: {
    avalanche: '0xTODO',
    ethereum: '0x1234567890123456789012345678901234567890', // Example address
  },
};
harden(ContractAddresses);
