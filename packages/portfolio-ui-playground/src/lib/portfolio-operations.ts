import type {
  TargetAllocation,
  PortfolioOperation,
  EIP712Types,
  EIP712Domain,
} from '../types.ts';

export const makeTxToSign = (
  allocations: TargetAllocation[],
  userAddress: string,
  now: number,
  amount: `${number}`,
  operation: 'openPortfolio' | 'deposit' | 'withdraw' | 'reallocate',
) => {
  const allocationEntries = allocations.map(alloc => {
    const poolOption = POOL_OPTIONS.find(
      option => option.key === alloc.poolKey,
    );
    return {
      protocol: poolOption?.protocol || alloc.poolKey,
      network: poolOption?.network || '',
      instrument: poolOption?.instrument || 'USDC',
      percentage: alloc.percentage,
    };
  });

  let message: PortfolioOperation;
  let primaryType: string;
  let types: EIP712Types;

  const baseFields = {
    user: userAddress,
    token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as `0x${string}`, // USDC contract address (Ethereum mainnet)
    chainId: '1', // Ethereum mainnet
    decimals: '6',
    nonce: `${now}` as `${number}`,
    deadline: `${now + 3600}` as `${number}`, // 1 hour
  };

  const tokenAmount = {
    amount: `${parseFloat(amount) * 1e6}` as `${number}`,
    token: baseFields.token,
  };

  switch (operation) {
    case 'openPortfolio':
      message = {
        user: baseFields.user,
        asset: tokenAmount,
        allocation: allocationEntries,
        nonce: baseFields.nonce,
        deadline: baseFields.deadline,
      };
      primaryType = 'OpenPortfolio';
      types = {
        OpenPortfolio: [
          { name: 'user', type: 'address' },
          { name: 'asset', type: 'TokenAmount' },
          { name: 'allocation', type: 'AllocationEntry[]' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenAmount: [
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
        ],
        AllocationEntry: [
          { name: 'protocol', type: 'string' },
          { name: 'network', type: 'string' },
          { name: 'instrument', type: 'string' },
          { name: 'percentage', type: 'uint256' },
        ],
      };
      break;
    case 'deposit':
      message = {
        user: baseFields.user,
        asset: tokenAmount,
        nonce: baseFields.nonce,
        deadline: baseFields.deadline,
      };
      primaryType = 'DepositIntent';
      types = {
        DepositIntent: [
          { name: 'user', type: 'address' },
          { name: 'asset', type: 'TokenAmount' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenAmount: [
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
        ],
      };
      break;
    case 'withdraw':
      message = {
        user: baseFields.user,
        asset: tokenAmount,
        nonce: baseFields.nonce,
        deadline: baseFields.deadline,
      };
      primaryType = 'WithdrawIntent';
      types = {
        WithdrawIntent: [
          { name: 'user', type: 'address' },
          { name: 'asset', type: 'TokenAmount' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        TokenAmount: [
          { name: 'amount', type: 'uint256' },
          { name: 'token', type: 'address' },
        ],
      };
      break;
    case 'reallocate':
      message = {
        ...baseFields,
        allocation: allocationEntries,
      };
      primaryType = 'ReallocateIntent';
      types = {
        ReallocateIntent: [
          { name: 'user', type: 'address' },
          { name: 'allocation', type: 'AllocationEntry[]' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
        AllocationEntry: [
          { name: 'protocol', type: 'string' },
          { name: 'network', type: 'string' },
          { name: 'instrument', type: 'string' },
          { name: 'percentage', type: 'uint256' },
        ],
      };
      break;
    default:
      throw new Error(`Unknown operation: ${operation}`);
  }

  const domain: EIP712Domain = {
    name: 'YMax Portfolio Authorization',
    version: '1',
  };
  return { domain, types, message };
};
export const POOL_OPTIONS = [
  { key: 'USDN', protocol: 'USDN', network: 'Noble', instrument: 'USDC' },
  {
    key: 'Aave_Ethereum',
    protocol: 'Aave',
    network: 'Ethereum',
    instrument: 'USDC',
  },
  {
    key: 'Aave_Arbitrum',
    protocol: 'Aave',
    network: 'Arbitrum',
    instrument: 'USDC',
  },
  {
    key: 'Aave_Optimism',
    protocol: 'Aave',
    network: 'Optimism',
    instrument: 'USDC',
  },
  { key: 'Aave_Base', protocol: 'Aave', network: 'Base', instrument: 'USDC' },
  {
    key: 'Compound_Ethereum',
    protocol: 'Compound',
    network: 'Ethereum',
    instrument: 'USDC',
  },
  {
    key: 'Compound_Arbitrum',
    protocol: 'Compound',
    network: 'Arbitrum',
    instrument: 'USDC',
  },
  {
    key: 'Compound_Optimism',
    protocol: 'Compound',
    network: 'Optimism',
    instrument: 'USDC',
  },
  {
    key: 'Compound_Base',
    protocol: 'Compound',
    network: 'Base',
    instrument: 'USDC',
  },
];
