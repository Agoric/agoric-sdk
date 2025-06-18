import { stringifyAmountValue } from '@agoric/ui-components';

type TradeProps = {
  makeOffer: () => void;
  withdrawUSDC: () => void;
  istPurse: Purse;
  walletConnected: boolean;
  offerId?: number;
  usdcPurse?: Purse;
};

// Simplified Trade component with only a fixed USDC give amount
const Trade = ({ makeOffer, withdrawUSDC, walletConnected, offerId, usdcPurse }: TradeProps) => {
  // Handle making an offer
  const handleMakeOffer = () => {
    makeOffer();
  };

  // Handle withdrawing USDC
  const handleWithdraw = () => {
    withdrawUSDC();
  };

  return (
    <>
      <div className="trade">
        <h3>Fixed Offer Details</h3>
        <div className="offer-details">
          <p>This offer will send exactly <strong>10,000 uUSDC</strong> to the contract.</p>
          {usdcPurse && (
            <p>
              Your current USDC balance: <strong>
                {stringifyAmountValue(
                  usdcPurse.currentAmount,
                  usdcPurse.displayInfo.assetKind,
                  usdcPurse.displayInfo.decimalPlaces,
                )}
              </strong>
            </p>
          )}
          <p>The offer is configured to only include the "give" part without a "want" part.</p>
          <p>After locking funds, you can withdraw using the withdraw button.</p>
        </div>
      </div>
      
      <div className="offer-actions">
        {walletConnected ? (
          <div className="button-group">
            <button onClick={handleMakeOffer}>
              Make Offer (10,000 uUSDC)
            </button>
            
            {offerId && (
              <button 
                onClick={handleWithdraw} 
                className="withdraw-button"
              >
                Withdraw USDC
              </button>
            )}
          </div>
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
        
        .button-group {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .withdraw-button {
          background-color: #4a90e2;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .withdraw-button:hover {
          background-color: #3a7bbd;
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
