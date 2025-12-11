import { BrowserProvider } from 'ethers';
import { useState } from 'preact/hooks';
import { makeTxToSign, POOL_OPTIONS } from '../lib/portfolio-operations.ts';
import type { PortfolioOperation, TargetAllocation } from '../types';

interface Props {
  userAddress: string;
  provider: EIP1193Provider;
  onSigned: (result: {
    message: PortfolioOperation;
    signature: string;
  }) => void;
}

export function OperationForm({ userAddress, provider, onSigned }: Props) {
  const [operation, setOperation] = useState<
    'openPortfolio' | 'deposit' | 'withdraw' | 'reallocate'
  >('openPortfolio');
  const [amount, setAmount] = useState<`${number}`>('1000');
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

      // Convert allocations to structured format
      const { domain, types, message } = makeTxToSign(
        allocations,
        userAddress,
        now,
        amount,
        operation,
      );

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
          onChange={e => setAmount(e.currentTarget.value as `${number}`)}
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
                  <option key={pool.key} value={pool.key}>
                    {pool.protocol} - {pool.network} ({pool.instrument})
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
