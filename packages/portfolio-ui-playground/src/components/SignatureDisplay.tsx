import type { BridgeAction } from '../types';

interface Props {
  message: BridgeAction;
  signature: string;
}

export function SignatureDisplay({ message, signature }: Props) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h2>✅ Signed Successfully!</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Message:</h3>
        <pre style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px', 
          overflow: 'auto',
          fontSize: '12px'
        }}>
          {JSON.stringify(message, null, 2)}
        </pre>
        <button 
          onClick={() => copyToClipboard(JSON.stringify(message, null, 2))}
          style={{ padding: '5px 10px', marginTop: '5px' }}
        >
          Copy Message
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>Signature:</h3>
        <div style={{ 
          background: '#f8f9fa', 
          padding: '15px', 
          borderRadius: '4px', 
          wordBreak: 'break-all',
          fontSize: '12px',
          fontFamily: 'monospace'
        }}>
          {signature}
        </div>
        <button 
          onClick={() => copyToClipboard(signature)}
          style={{ padding: '5px 10px', marginTop: '5px' }}
        >
          Copy Signature
        </button>
      </div>

      <div style={{ 
        background: '#d1ecf1', 
        border: '1px solid #bee5eb', 
        padding: '15px', 
        borderRadius: '4px',
        fontSize: '14px'
      }}>
        <strong>Next Steps:</strong> This signed message would be submitted to the Agoric bridge/API 
        to execute the portfolio operation on the YMax contract.
      </div>
    </div>
  );
}
