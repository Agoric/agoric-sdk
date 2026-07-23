# USDN Portfolio Position Flow: Complete Analysis

## The Diagram: Complete Flow Description

This sequence diagram illustrates the **"3 way yield - 3. USDN"** flow, showing how a trader opens a yield-earning position in USDN (Noble USD) through cross-chain DeFi orchestration.

### **Broader Context: Yield Strategy**
The trader is implementing a diversified yield strategy across multiple DeFi protocols. While this diagram focuses on the USDN component, the broader strategy involves:
- **Aave positions** (lending protocol on EVM chains)
- **Compound positions** (lending protocol) 
- **USDN positions** (Noble's yield-bearing stablecoin)

The goal is to earn yield on stablecoins across different blockchain ecosystems through a unified Agoric interface.

### **Detailed Flow with Method Names:**

1. **Initiation**: Trader calls `openPortfolio({give: {Aave: 3k, Compound: 2k, USDN: 3K}})` requesting multiple positions

2. **Portfolio Setup**: 
   - `ymax` delegates to `flows.openPortfolio`
   - Flow creates a `portfolio` contract instance
   - Flow calls `makeAccount` on Noble chain, creating ICAn (Interchain Account)
   - **Ack pattern**: ICAn responds, confirming account creation

3. **Fund Movement**:
   - `localTransfer(3K)` - moves funds from trader to LCA (Local Cosmos Account)
   - **Special notation**: Uses solid arrow (`-->`) because this could be synchronous
   - `transfer(ICAn, 3K USDC)` - IBC transfer from Agoric LCA to Noble ICAn
   - **Ack pattern**: ICAn confirms receipt

4. **Yield Position Creation**:
   - `executeEncodedTx([MsgSwap(3K), MsgLock(3K*)])` - executes two Noble protocol messages:
     - `MsgSwap`: Converts USDC to USDN
     - `MsgLock`: Locks USDN in yield-earning vault
   - **Ack pattern**: USDN protocol confirms execution

5. **Completion**: Returns `{invitationMakers, topics: ...noble1xyz}` for ongoing management

### **Diagram Notation Used**:
- **Dashed arrows (`-->>`)**: Asynchronous operations requiring `await` with corresponding `ack` responses
- **Solid arrows (`-->`)**: Operations that are async in current API but could be synchronous
- **Ack arrows**: Show async operation completions corresponding to `await` in code
- **Method names**: Match exact `_method` names from implementation

## Relationship to Tests

### **Flows Test Relationship**:
The flows test **directly implements** this diagram's logic:

- **Exact method correspondence**: Every arrow in the diagram maps to a `_method` in the test log
- **Same sequence**: monitorTransfers → localTransfer → transfer → executeEncodedTx → exit
- **Error handling**: Tests failure modes at each step with proper unwinding
- **Simplified scale**: Uses 100 USDC instead of 3K for testing, but same operations

**Key insight**: The flows test validates the orchestration mechanics shown in the diagram work correctly.

### **Contract Test Relationship**:
The contract test reveals **real-world implementation constraints**:

- **Partial fulfillment**: While diagram shows multi-position request, contract currently only processes USDN
- **Graceful degradation**: Unimplemented positions (Aave, Compound) result in refunds rather than failures
- **Same USDN flow**: The Noble chain operations match the diagram exactly
- **User experience**: Trader gets their USDN position opened + refunds for unprocessed positions

**Key insight**: The contract test shows how the system handles the gap between user intent (diagram) and current implementation reality.

### **Summary of Relationships**:
- **Diagram** = Complete architectural vision and user intent
- **Flows Test** = Validates the technical mechanics work as designed  
- **Contract Test** = Shows current implementation handles partial fulfillment gracefully

The diagram accurately depicts both the intended full system and the currently working USDN subset, with the tests validating different aspects of this multi-layered system.

## Files Referenced

- **Sequence Diagram**: `packages/portfolio-contract/test/open-pos-usdn.mmd`
- **Flows Test**: `packages/portfolio-contract/test/portfolio.flows.test.ts`
- **Contract Test**: `packages/portfolio-contract/test/portfolio.contract.test.ts`
- **Implementation**: `packages/portfolio-contract/src/portfolio.flows.ts`
