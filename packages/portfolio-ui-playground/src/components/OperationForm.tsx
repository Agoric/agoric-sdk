import { useState } from 'preact/hooks';
import { BrowserProvider } from 'ethers';
import type {
  PortfolioOperation,
  TargetAllocation,
  EIP712Domain,
  EIP712Types,
  AllocationEntry,
} from '../types';

interface Props {
  userAddress: string;
  provider: EIP1193Provider;
  onSigned: (result: {
    message: PortfolioOperation;
    signature: string;
  }) => void;
}

const POOL_OPTIONS = [
  'USDN',
  'Aave_Ethereum',
  'Aave_Arbitrum',
  'Aave_Optimism',
  'Aave_Base',
  'Compound_Ethereum',
  'Compound_Arbitrum',
  'Compound_Optimism',
  'Compound_Base',
];

export function OperationForm({ userAddress, provider, onSigned }: Props) {
  const [operation, setOperation] = useState<
    'openPortfolio' | 'deposit' | 'withdraw' | 'reallocate'
  >('openPortfolio');
  const [amount, setAmount] = useState('1000');
  const [allocations, setAllocations] = useState<TargetAllocation[]>([
    { poolKey: 'USDN', percentage: 50 },
    { poolKey: 'Aave_Ethereum', percentage: 50 },
  ]);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string>('');

  const addAllocation = () => {
    setAllocations([...allocations, { poolKey: 'USDN', percentage: 0 }]);
  };

  const updateAllocation = (
    index: number,
    field: keyof TargetAllocation,
    value: string | number,
  ) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const totalPercentage = allocations.reduce(
    (sum, alloc) => sum + alloc.percentage,
    0,
  );

  const signMessage = async () => {
    if (
      (operation === 'openPortfolio' || operation === 'reallocate') &&
      totalPercentage !== 100
    ) {
      setError('Total allocation must equal 100%');
      return;
    }

    setSigning(true);
    setError('');

    try {
      const now = Math.floor(Date.now() / 1000);

      // Convert allocations to clean format
      const allocationEntries = allocations.map(alloc => ({
        protocol: alloc.poolKey.replace('_', ' '), // "Aave_Ethereum" -> "Aave Ethereum"
        percentage: alloc.percentage,
      }));

      let message: PortfolioOperation;
      let primaryType: string;
      let types: EIP712Types;

      const baseFields = {
        user: userAddress,
        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC contract address (Ethereum mainnet)
        chainId: '1', // Ethereum mainnet
        decimals: '6',
        nonce: now.toString(),
        deadline: (now + 3600).toString(), // 1 hour
      };

      const tokenAmount = {
        amount: (parseFloat(amount) * 1e6).toString(),
        token: baseFields.token,
      };

      switch (operation) {
        case 'openPortfolio':
          message = {
            user: baseFields.user,
            deposit: tokenAmount,
            allocation: allocationEntries,
            nonce: baseFields.nonce,
            deadline: baseFields.deadline,
          };
          primaryType = 'OpenPortfolio';
          types = {
            OpenPortfolio: [
              { name: 'user', type: 'address' },
              { name: 'deposit', type: 'TokenAmount' },
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
              { name: 'percentage', type: 'uint256' },
            ],
          };
          break;
        case 'deposit':
          message = {
            user: baseFields.user,
            deposit: tokenAmount,
            nonce: baseFields.nonce,
            deadline: baseFields.deadline,
          };
          primaryType = 'DepositIntent';
          types = {
            DepositIntent: [
              { name: 'user', type: 'address' },
              { name: 'deposit', type: 'TokenAmount' },
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
            withdraw: tokenAmount,
            nonce: baseFields.nonce,
            deadline: baseFields.deadline,
          };
          primaryType = 'WithdrawIntent';
          types = {
            WithdrawIntent: [
              { name: 'user', type: 'address' },
              { name: 'withdraw', type: 'TokenAmount' },
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

      const ethersProvider = new BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      const signature = await signer.signTypedData(domain, types, message);

      onSigned({ message, signature });
    } catch (err: any) {
      setError(err.message || 'Failed to sign message');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div style={{ marginBottom: '30px' }}>
      <h2>Create Portfolio Operation</h2>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
        >
          Operation Type:
        </label>
        <select
          value={operation}
          onChange={e => setOperation(e.currentTarget.value as any)}
          style={{ padding: '8px', width: '200px' }}
        >
          <option value="openPortfolio">Open Portfolio</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
          <option value="reallocate">Reallocate</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label
          style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}
        >
          Amount (USDC):
        </label>
        <input
          type="number"
          value={amount}
          onChange={e => setAmount(e.currentTarget.value)}
          style={{ padding: '8px', width: '200px' }}
          step="0.01"
          min="0"
        />
      </div>

      {(operation === 'openPortfolio' || operation === 'reallocate') && (
        <div style={{ marginBottom: '20px' }}>
          <label
            style={{
              display: 'block',
              marginBottom: '10px',
              fontWeight: 'bold',
            }}
          >
            Target Allocation:
          </label>

          {allocations.map((alloc, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                gap: '10px',
                marginBottom: '10px',
                alignItems: 'center',
              }}
            >
              <select
                value={alloc.poolKey}
                onChange={e =>
                  updateAllocation(index, 'poolKey', e.currentTarget.value)
                }
                style={{ padding: '5px', flex: 1 }}
              >
                {POOL_OPTIONS.map(pool => (
                  <option key={pool} value={pool}>
                    {pool}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={alloc.percentage}
                onChange={e =>
                  updateAllocation(
                    index,
                    'percentage',
                    parseInt(e.currentTarget.value) || 0,
                  )
                }
                style={{ padding: '5px', width: '100px' }}
                placeholder="Percentage"
                min="0"
                max="100"
              />
              <span style={{ fontSize: '12px', color: '#666' }}>%</span>
              <button
                onClick={() => removeAllocation(index)}
                style={{
                  padding: '5px 10px',
                  background: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                }}
              >
                Remove
              </button>
            </div>
          ))}

          <button
            onClick={addAllocation}
            style={{
              padding: '8px 16px',
              background: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              marginRight: '10px',
            }}
          >
            Add Allocation
          </button>

          <span
            style={{
              fontSize: '14px',
              color: totalPercentage === 100 ? '#28a745' : '#dc3545',
            }}
          >
            Total: {totalPercentage}%
          </span>
        </div>
      )}

      <button
        onClick={signMessage}
        disabled={
          signing ||
          ((operation === 'openPortfolio' || operation === 'reallocate') &&
            totalPercentage !== 100)
        }
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          background:
            signing ||
            ((operation === 'openPortfolio' || operation === 'reallocate') &&
              totalPercentage !== 100)
              ? '#6c757d'
              : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor:
            signing ||
            ((operation === 'openPortfolio' || operation === 'reallocate') &&
              totalPercentage !== 100)
              ? 'not-allowed'
              : 'pointer',
        }}
      >
        {signing ? 'Signing...' : 'Sign with MetaMask'}
      </button>

      {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
    </div>
  );
}
