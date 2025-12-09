import { useState } from 'preact/hooks';
import { BrowserProvider } from 'ethers';
import type { PortfolioOperation, TargetAllocation, EIP712Domain, EIP712Types, AllocationEntry } from '../types';

interface Props {
  userAddress: string;
  provider: EIP1193Provider;
  onSigned: (result: { message: PortfolioOperation; signature: string }) => void;
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
  'Compound_Base'
];

export function OperationForm({ userAddress, provider, onSigned }: Props) {
  const [operation, setOperation] = useState<PortfolioOperation['intent']>('allocate');
  const [amount, setAmount] = useState('1000');
  const [allocations, setAllocations] = useState<TargetAllocation[]>([
    { poolKey: 'USDN', basisPoints: 5000 },
    { poolKey: 'Aave_Ethereum', basisPoints: 5000 }
  ]);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string>('');

  const addAllocation = () => {
    setAllocations([...allocations, { poolKey: 'USDN', basisPoints: 0 }]);
  };

  const updateAllocation = (index: number, field: keyof TargetAllocation, value: string | number) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const totalBasisPoints = allocations.reduce((sum, alloc) => sum + alloc.basisPoints, 0);

  const signMessage = async () => {
    if (totalBasisPoints !== 10000) {
      setError('Total allocation must equal 100% (10000 basis points)');
      return;
    }

    setSigning(true);
    setError('');

    try {
      const now = Math.floor(Date.now() / 1000);
      
      // Convert allocations to user-friendly format
      const allocationEntries = allocations.map(alloc => ({
        protocol: alloc.poolKey.replace('_', ' '), // "Aave_Ethereum" -> "Aave Ethereum"
        percentage: `${(alloc.basisPoints / 100).toFixed(2)}%`
      }));

      const message: PortfolioOperation = {
        intent: operation === 'openPortfolio' ? 'allocate' : operation,
        user: userAddress,
        depositAmount: parseFloat(amount).toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        }), // "1,000.00"
        token: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC contract address (Ethereum mainnet)
        decimals: '6',
        allocation: allocationEntries,
        nonce: now,
        deadline: now + 3600 // 1 hour
      };

      const domain: EIP712Domain = {
        name: 'YMax Portfolio Authorization',
        version: '1'
      };

      const types: EIP712Types = {
        PortfolioOperation: [
          { name: 'intent', type: 'string' },
          { name: 'user', type: 'address' },
          { name: 'depositAmount', type: 'string' },
          { name: 'token', type: 'address' },
          { name: 'decimals', type: 'string' },
          { name: 'allocation', type: 'AllocationEntry[]' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' }
        ],
        AllocationEntry: [
          { name: 'protocol', type: 'string' },
          { name: 'percentage', type: 'string' }
        ]
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
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Operation Type:
        </label>
        <select 
          value={operation} 
          onChange={(e) => setOperation(e.currentTarget.value as any)}
          style={{ padding: '8px', width: '200px' }}
        >
          <option value="allocate">Allocate Funds</option>
          <option value="deposit">Deposit</option>
          <option value="rebalance">Rebalance</option>
          <option value="withdraw">Withdraw</option>
        </select>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
          Amount (USDC):
        </label>
        <input 
          type="number" 
          value={amount}
          onChange={(e) => setAmount(e.currentTarget.value)}
          style={{ padding: '8px', width: '200px' }}
          step="0.01"
          min="0"
        />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
          Target Allocation:
        </label>
        
        {allocations.map((alloc, index) => (
          <div key={index} style={{ display: 'flex', gap: '10px', marginBottom: '10px', alignItems: 'center' }}>
            <select 
              value={alloc.poolKey}
              onChange={(e) => updateAllocation(index, 'poolKey', e.currentTarget.value)}
              style={{ padding: '5px', flex: 1 }}
            >
              {POOL_OPTIONS.map(pool => (
                <option key={pool} value={pool}>{pool}</option>
              ))}
            </select>
            <input 
              type="number"
              value={alloc.basisPoints}
              onChange={(e) => updateAllocation(index, 'basisPoints', parseInt(e.currentTarget.value) || 0)}
              style={{ padding: '5px', width: '100px' }}
              placeholder="Basis points"
              min="0"
              max="10000"
            />
            <span style={{ fontSize: '12px', color: '#666' }}>
              ({(alloc.basisPoints / 100).toFixed(2)}%)
            </span>
            <button 
              onClick={() => removeAllocation(index)}
              style={{ padding: '5px 10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              Remove
            </button>
          </div>
        ))}
        
        <button 
          onClick={addAllocation}
          style={{ padding: '8px 16px', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', marginRight: '10px' }}
        >
          Add Allocation
        </button>
        
        <span style={{ fontSize: '14px', color: totalBasisPoints === 10000 ? '#28a745' : '#dc3545' }}>
          Total: {totalBasisPoints} basis points ({(totalBasisPoints / 100).toFixed(2)}%)
        </span>
      </div>

      <button 
        onClick={signMessage}
        disabled={signing || totalBasisPoints !== 10000}
        style={{ 
          padding: '12px 24px', 
          fontSize: '16px', 
          background: signing || totalBasisPoints !== 10000 ? '#6c757d' : '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: signing || totalBasisPoints !== 10000 ? 'not-allowed' : 'pointer'
        }}
      >
        {signing ? 'Signing...' : 'Sign with MetaMask'}
      </button>

      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
