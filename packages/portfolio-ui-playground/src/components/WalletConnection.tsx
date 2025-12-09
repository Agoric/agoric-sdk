import { Signal } from '@preact/signals';
import { useState, useEffect } from 'preact/hooks';
import { BrowserProvider } from 'ethers';

interface Props {
  address: Signal<string>;
  selectedProvider: Signal<EIP1193Provider | null>;
}

interface WalletOption {
  info: EIP6963ProviderInfo;
  provider: EIP1193Provider;
}

export function WalletConnection({ address, selectedProvider }: Props) {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>('');
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<WalletOption | null>(null);

  useEffect(() => {
    const handleAnnouncement = (event: EIP6963AnnounceProviderEvent) => {
      setWallets(prev => {
        const exists = prev.some(w => w.info.uuid === event.detail.info.uuid);
        if (exists) return prev;
        return [...prev, event.detail];
      });
    };

    window.addEventListener('eip6963:announceProvider', handleAnnouncement);
    
    // Request wallets to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnouncement);
    };
  }, []);

  const connectWallet = async (wallet: WalletOption) => {
    setConnecting(true);
    setError('');
    setSelectedWallet(wallet);

    try {
      // Request accounts using EIP-1193
      const accounts = await wallet.provider.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length > 0) {
        address.value = accounts[0];
        selectedProvider.value = wallet.provider;
        
        // Listen for account changes
        wallet.provider.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length > 0) {
            address.value = accounts[0];
          } else {
            address.value = '';
            selectedProvider.value = null;
            setSelectedWallet(null);
          }
        });

        // Listen for disconnection
        wallet.provider.on('disconnect', () => {
          address.value = '';
          selectedProvider.value = null;
          setSelectedWallet(null);
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      setSelectedWallet(null);
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    address.value = '';
    selectedProvider.value = null;
    setSelectedWallet(null);
  };

  if (address.value && selectedWallet) {
    return (
      <div style={{ marginBottom: '30px', padding: '15px', background: '#d4edda', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img 
              src={selectedWallet.info.icon} 
              alt={selectedWallet.info.name}
              style={{ width: '24px', height: '24px' }}
            />
            <div>
              <strong>Connected via {selectedWallet.info.name}:</strong><br />
              {address.value.slice(0, 6)}...{address.value.slice(-4)}
            </div>
          </div>
          <button onClick={disconnect} style={{ padding: '5px 10px' }}>
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div style={{ marginBottom: '30px' }}>
        <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '4px', textAlign: 'center' }}>
          <p>No wallets detected. Please install a Web3 wallet like MetaMask.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3>Choose a wallet to connect:</h3>
      <div style={{ display: 'grid', gap: '10px', marginBottom: '15px' }}>
        {wallets.map((wallet) => (
          <button
            key={wallet.info.uuid}
            onClick={() => connectWallet(wallet)}
            disabled={connecting}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              cursor: connecting ? 'not-allowed' : 'pointer',
              fontSize: '16px'
            }}
          >
            <img 
              src={wallet.info.icon} 
              alt={wallet.info.name}
              style={{ width: '32px', height: '32px' }}
            />
            <span>{wallet.info.name}</span>
            {connecting && <span style={{ marginLeft: 'auto' }}>Connecting...</span>}
          </button>
        ))}
      </div>
      {error && (
        <div style={{ color: 'red', marginTop: '10px' }}>
          {error}
        </div>
      )}
    </div>
  );
}
