import { Signal } from '@preact/signals';
import { useState } from 'preact/hooks';
import { BrowserProvider } from 'ethers';

interface Props {
  address: Signal<string>;
}

export function WalletConnection({ address }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install MetaMask.');
      return;
    }

    setConnecting(true);
    setError('');

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      address.value = accounts[0];
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    address.value = '';
  };

  if (address.value) {
    return (
      <div style={{ marginBottom: '30px', padding: '15px', background: '#d4edda', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Connected:</strong> {address.value.slice(0, 6)}...{address.value.slice(-4)}
          </div>
          <button onClick={disconnect} style={{ padding: '5px 10px' }}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <button 
        onClick={connectWallet} 
        disabled={connecting}
        style={{ 
          padding: '12px 24px', 
          fontSize: '16px', 
          background: '#007bff', 
          color: 'white', 
          border: 'none', 
          borderRadius: '4px',
          cursor: connecting ? 'not-allowed' : 'pointer'
        }}
      >
        {connecting ? 'Connecting...' : 'Connect MetaMask'}
      </button>
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
