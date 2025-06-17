

type TradeProps = {
  makeOffer: () => void;
  istPurse: Purse;
  walletConnected: boolean;
};

// Simplified Trade component with only a fixed USDC give amount
const Trade = ({ makeOffer, walletConnected }: TradeProps) => {
  // Handle making an offer
  const handleMakeOffer = () => {
    makeOffer();
  };

  return (
    <>
      <div className="trade">
        <h3>Fixed Offer Details</h3>
        <div className="offer-details">
          <p>This offer will send exactly <strong>10,000 uUSDC</strong> to the contract.</p>
          <p>The offer is configured to only include the "give" part without a "want" part.</p>
        </div>
      </div>
      
      <div className="offer-actions">
        {walletConnected ? (
          <button onClick={handleMakeOffer}>
            Make Offer (10,000 uUSDC)
          </button>
        ) : (
          <p>Please connect your wallet to make an offer.</p>
        )}
      </div>

      <style>{`
        .offer-details {
          background-color: #f5f5f5;
          border: 1px solid #ddd;
          border-radius: 5px;
          padding: 15px;
          margin-bottom: 20px;
        }
        
        .offer-details p {
          margin: 8px 0;
        }
        
        .offer-actions {
          margin-top: 20px;
        }

        .modal {
          display: block;
          position: fixed;
          z-index: 1;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.4);
        }
        
        .modal-content {
          background-color: #fefefe;
          margin: 15% auto;
          padding: 20px;
          border: 1px solid #888;
          width: 80%;
          max-width: 600px;
          border-radius: 5px;
        }
        
        .close {
          color: #aaa;
          float: right;
          font-size: 28px;
          font-weight: bold;
          cursor: pointer;
        }
        
        pre {
          background-color: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 3px;
          padding: 10px;
          overflow: auto;
          max-height: 400px;
        }
      `}</style>
    </>
  );
};

export { Trade };
