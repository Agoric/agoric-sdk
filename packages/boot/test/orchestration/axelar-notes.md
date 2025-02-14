# Axelar GMP Contract Workspace

## Overview
Building a Zoe contract that enables:
1. Generic GMP message sending across Axelar
2. Contract-specific interfaces (Counter, Aave) with built-in ABI encoding
3. Support for three Axelar message types: message-only, message+token, token-only

## Core Types & Interfaces

```typescript
// src/types.js

/**
 * Types of GMP messages supported by Axelar
 */
export const GMPMessageType = {
  /** Message only, no token transfer (e.g. Counter.setCount) */
  MESSAGE_ONLY: 1,
  /** Message with token transfer (e.g. Aave.depositETH) */
  MESSAGE_WITH_TOKEN: 2, 
  /** Pure token transfer */
  TOKEN_ONLY: 3
} as const;

/**
 * Core EVM contract invocation details
 */
interface ContractInvocation {
  evmContractAddress: string;
  functionSelector: string;  // 4-byte selector
  encodedArgs: string;      // ABI encoded arguments
}

/**
 * Contract addresses by chain
 */
export const ContractAddresses = {
  aaveV3: {
    ethereum: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  },
  counter: {
    ethereum: '0x...',  // TBD
  }
} as const;

// Offer Interfaces
interface SendGMPOffer {
  destAddr: string;
  destinationEVMChain: string;
  gasAmount: number;
  type: typeof GMPMessageType.MESSAGE_ONLY | typeof GMPMessageType.MESSAGE_WITH_TOKEN | typeof GMPMessageType.TOKEN_ONLY;
  payload?: number[];    // For types 1 & 2
  proposal?: {
    give: { Send: Amount }; // For types 2 & 3
  };
}

interface SetCountOffer {
  destAddr: string;
  destinationEVMChain: string;
  gasAmount: number;
  params: {
    newCount: number;
  };
}

interface DepositToAaveOffer {
  destAddr: string;
  destinationEVMChain: string;
  gasAmount: number;
  params: {
    onBehalfOf: string;
    referralCode?: number;
  };
  proposal: {
    give: { Send: Amount }; // ETH amount
  };
}

// Contract Public Facet
interface GMPPublicFacet {
  makeSendGMPInvitation(): Invitation;
  makeSetCountInvitation(): Invitation;
  makeDepositToAaveInvitation(): Invitation;
}
```

## File Structure
```
src/
  ├── examples/
      ├── axelar-gmp.contract.js  # Main Zoe contract
      ├── axelar.flows.js         # Offer handlers
  ├── utils/
      |-- abi-encoder.js     # ABI encoding functions
      ├── gmp-builder.js     # GMP payload construction
      |-- evm-contracts/
         |-- aave.v3.js
         |-- counter.js
  └── test/
      ├── fixtures.js    # Known good encodings
      └── test-*.js      # Test files
```

## Implementation Plan

### 1. Core Infrastructure (2-3 days)

#### ABI Encoder (abi-encoder.js)
```typescript
/**
 * ABI encoding functions using @metamask/abi-utils
 */
export const aaveContractFns = {
  // Matches depositETH fixture exactly
  depositETH: (onBehalfOf: string, referralCode: number = 0) => {
    // Returns { functionSelector, encodedArgs }
  },
  
  supply: (asset: string, amount: bigint, onBehalfOf: string, referralCode: number = 0) => {
    // Returns { functionSelector, encodedArgs }
  }
};

const counterContractFns = {
  setCount: (newCount: number) => {
    // Returns { functionSelector, encodedArgs }
  },
}
```

#### GMP Builder (gmp-builder.js)
```typescript
export const buildGMPPayload = ({
  type,
  evmContractAddress,
  functionSelector,
  encodedArgs,
}) => {
  // Build payload based on type
  // Returns number[]
};
```

### 2. Contract Implementation (2-3 days)

#### Main Contract (contract.js)
```typescript
export const start = async (zcf) => {
  // Setup chain hub & local account
  
  const publicFacet = {
    // Generic GMP send
    makeSendGMPInvitation() {
      return zcf.makeInvitation(/* ... */);
    },
    
    // Contract-specific invitations
    makeSetCountInvitation() {
      return zcf.makeInvitation(/* ... */);
    },
    
    makeDepositToAaveInvitation() {
      return zcf.makeInvitation(/* ... */);
    }
  };
  
  return { publicFacet };
};
```

### 3. Testing & Documentation (1-2 days)

#### Test Cases
1. Known Fixtures
```typescript
// test/fixtures.js
export const knownEncodings = {
  depositETH: {
    selector: '0x474cf53d',
    args: [
      '0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951',
      '0xc52e119b488a9aCd7744Afb5bf8B2066eb620a18',
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    ]
  }
};
```

2. Flow Tests
- Generic GMP send for all types
- setCount specific flow
- depositETH specific flow

## Notes
- depositETH uses transaction value for amount
- Need to handle IBC transfer errors
- Consider future contract additions
