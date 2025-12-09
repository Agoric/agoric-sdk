import { signal } from '@preact/signals';
import { WalletConnection } from './components/WalletConnection';
import { OperationForm } from './components/OperationForm';
import { SignatureDisplay } from './components/SignatureDisplay';
import type { PortfolioOperation } from './types';

const walletAddress = signal<string>('');
const selectedProvider = signal<EIP1193Provider | null>(null);
const signedMessage = signal<{ message: PortfolioOperation; signature: string } | null>(null);

export function App() {
  return (
    <div className="container">
      <div className="warning">
        <strong>⚠️ PROTOTYPE ONLY</strong> - This is a non-production demo for testing EIP-712 signing with YMax portfolio operations.
      </div>
      
      <h1>YMax Portfolio UI Playground</h1>
      
      <WalletConnection 
        address={walletAddress}
        selectedProvider={selectedProvider}
      />
      
      {walletAddress.value && selectedProvider.value && (
        <OperationForm 
          userAddress={walletAddress.value}
          provider={selectedProvider.value}
          onSigned={(result) => signedMessage.value = result}
        />
      )}
      
      {signedMessage.value && (
        <SignatureDisplay 
          message={signedMessage.value.message}
          signature={signedMessage.value.signature}
        />
      )}
    </div>
  );
}
