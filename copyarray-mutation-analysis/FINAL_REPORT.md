# CopyArray Mutation Analysis - Final Report

## Executive Summary

After a comprehensive analysis of the Agoric SDK codebase, **NO instances were found where arrays declared as `CopyArray` or `readonly` types are being mutated**.

## Analysis Methodology

### Phase 1: Direct CopyArray Type Search
- Searched for `CopyArray` type in:
  - JSDoc `@type` annotations
  - TypeScript type annotations
  - `@param` annotations
  - `@typedef` annotations
  - `@import` statements

**Result**: No direct usage of `CopyArray` type found in the Agoric SDK source code.

### Phase 2: SetValue (CopyArray Equivalent) Search
`SetValue` is a deprecated array-based type that represents arrays of passable keys (essentially a CopyArray).

**Files Found with SetValue Type:**
1. `packages/ERTP/src/amountMath.js`
2. `packages/ERTP/src/mathHelpers/setMathHelpers.js`
3. `packages/ERTP/src/typeGuards.js`
4. `packages/notifier/tools/testSupports.js`
5. `packages/zoe/test/unitTests/setupNonFungibleMints.js`

**Mutation Analysis Result**: None of these files mutate SetValue arrays.
- Line 28 in `amountMath.js` has `.sort()` but it's on `Object.values(AssetKind)`, not a SetValue
- All other array operations are on different, mutable arrays

### Phase 3: Readonly Array Analysis
Found 20 files with `readonly` array type annotations.

**Files with both readonly declarations AND array mutations:**
1. `packages/client-utils/test/signing-smart-wallet-kit.test.ts`
2. `packages/fast-usdc-contract/src/utils/settlement-matcher.ts`
3. `packages/internal/src/ses-utils.js`
4. `packages/internal/src/testing-utils.js`
5. `packages/orchestration/src/utils/viem-utils/hashTypedData.ts`
6. `packages/orchestration/test/staking-ops.test.ts`
7. `packages/portfolio-contract/src/evm-facade.ts`
8. `packages/portfolio-contract/test/evm-wallet-handler.test.ts`
9. `packages/telemetry/src/make-slog-sender.js`

**Detailed Verification**: Manual inspection of these files revealed:
- In ALL cases, the `readonly` type annotation is on **function parameters** or return types
- The actual mutations occur on **separate, locally-declared mutable arrays**
- **NO readonly arrays are being mutated**

### Example Analysis

#### `packages/fast-usdc-contract/src/utils/settlement-matcher.ts`
```typescript
const greedyMatch = (
  pending: readonly PendingTx[],  // ← readonly parameter
  target: bigint,
): PendingTx[] => {
  const path: PendingTx[] = [];   // ← separate mutable array
  
  const dfs = (index: number, sum: bigint): boolean => {
    path.push(tx);                 // ← mutates 'path', NOT 'pending'
    if (dfs(i + 1, nextSum)) return true;
    path.pop();                    // ← mutates 'path', NOT 'pending'
  };
  
  return dfs(0, 0n) ? path : [];
};
```

#### `packages/internal/src/ses-utils.js`
```javascript
// @param {readonly (T | PromiseLike<T>)[]} items  ← readonly parameter
export const PromiseAllOrErrors = async items => {
  // 'items' is never mutated
  return Promise.allSettled(items).then(results => {
    const errors = results.filter(...);  // non-mutating operation
    // ...
  });
};

export const withDeferredCleanup = async fn => {
  const cleanupsLIFO = [];        // ← separate mutable array
  const addCleanup = cleanup => {
    cleanupsLIFO.unshift(cleanup); // ← mutates 'cleanupsLIFO'
  };
  // ...
};
```

## Conclusion

**FINDING: Zero violations found.**

The Agoric SDK codebase correctly respects immutability constraints:
1. No arrays declared as `CopyArray` type were found being mutated
2. No arrays declared as `SetValue` type were found being mutated  
3. No `readonly` array types were found being mutated
4. All mutation operations occur on separate, explicitly mutable array variables

The codebase demonstrates proper functional programming practices by:
- Using `readonly` types for immutable parameters
- Creating new mutable arrays when mutations are needed
- Avoiding in-place mutations of pass-by-copy data structures

## Files Analyzed

**Total TypeScript files analyzed**: ~1000+
**Total JavaScript files analyzed**: ~2000+
**Files with SetValue types**: 5
**Files with readonly arrays**: 20
**Files flagged for detailed inspection**: 9
**Violations found**: 0

## Recommendations

The codebase is already following best practices. No changes are recommended.
