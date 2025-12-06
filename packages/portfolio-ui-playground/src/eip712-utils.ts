import type { BridgeAction, TargetAllocation, EIP712Domain, EIP712Types } from './types';

/**
 * Convert form data to EIP-712 message structure
 */
export const createEIP712Message = (
  operation: 'openPortfolio' | 'rebalance' | 'deposit' | 'withdraw',
  userAddress: string,
  amount: string,
  allocations: TargetAllocation[]
): BridgeAction => {
  const now = Math.floor(Date.now() / 1000);
  
  // Convert allocations to LegibleCapData format (bigints as "+5000")
  const targetAllocation = allocations.reduce((acc, alloc) => {
    acc[alloc.poolKey] = `+${alloc.basisPoints}`;
    return acc;
  }, {} as Record<string, string>);

  return {
    method: 'executeOffer',
    offer: {
      id: `${operation}-${Date.now()}`,
      invitationSpec: {
        source: 'agoricContract',
        instancePath: ['ymax0'],
        callPipe: JSON.stringify([['makeOpenPortfolioInvitation', []]])
      },
      proposal: {
        give: {
          Deposit: {
            brand: 'USDC',
            value: (parseFloat(amount) * 1e6).toString()
          }
        }
      },
      offerArgs: {
        targetAllocation
      }
    },
    user: userAddress,
    nonce: now,
    deadline: now + 3600 // 1 hour
  };
};

/**
 * Get EIP-712 domain and types
 */
export const getEIP712Config = () => {
  const domain: EIP712Domain = {
    name: 'YMax Portfolio Authorization',
    version: '1'
  };

  const types: EIP712Types = {
    BridgeAction: [
      { name: 'method', type: 'string' },
      { name: 'offer', type: 'OfferSpec' },
      { name: 'user', type: 'address' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' }
    ],
    OfferSpec: [
      { name: 'id', type: 'string' },
      { name: 'invitationSpec', type: 'InvitationSpec' },
      { name: 'proposal', type: 'Proposal' },
      { name: 'offerArgs', type: 'OfferArgs' }
    ],
    InvitationSpec: [
      { name: 'source', type: 'string' },
      { name: 'instancePath', type: 'string[]' },
      { name: 'callPipe', type: 'string' }
    ],
    Proposal: [
      { name: 'give', type: 'string' },
    ],
    OfferArgs: [
      { name: 'targetAllocation', type: 'string' }
    ]
  };

  return { domain, types };
};
