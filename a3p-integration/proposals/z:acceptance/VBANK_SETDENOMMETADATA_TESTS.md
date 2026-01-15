# vbank/MsgSetDenomMetaData Integration Tests

This document describes the integration tests for the
`vbank/MsgSetDenomMetaData` governance message.

## Overview

Two test files have been created to validate the `vbank/MsgSetDenomMetaData`
functionality:

1. **Phase 1 (m:before-upgrade-next)**: Tests that the message type does NOT
   exist before upgrade
2. **Phase 2 (z:acceptance)**: Tests that the message works correctly after
   upgrade

## Files Created

### Phase 1: Test Absence Before Upgrade

- **File**:
  `a3p-integration/proposals/m:before-upgrade-next/test/vbank-msg-absence.test.js`
- **Purpose**: Verify that `vbank/MsgSetDenomMetaData` is not available
- **Test**: Attempts to submit a governance proposal with the message type and
  expects it to fail

### Phase 2: Test Functionality After Upgrade

- **File**:
  `a3p-integration/proposals/z:acceptance/test/vbank-setdenommetadata.test.js`
- **Purpose**: Verify complete functionality of `vbank/MsgSetDenomMetaData`
- **Tests**:
  1. Can query existing denom metadata
  2. Can submit and execute governance proposal to set denom metadata
  3. Can update existing denom metadata
  4. Invalid metadata fails validation

## Test Coverage

### m:before-upgrade-next Tests

```javascript
test('vbank/MsgSetDenomMetaData message type should not exist')
```

Verifies that attempting to create a governance proposal with the message type
fails with an appropriate error (unknown type, not found, unrecognized, etc.).

### z:acceptance Tests

#### 1. Query Existing Metadata

```javascript
test.serial('can query existing denom metadata')
```

- Queries all denom metadata using `agd query bank denoms-metadata`
- Verifies BLD metadata exists
- Confirms metadata structure is correct

#### 2. Set New Metadata via Governance

```javascript
test.serial('can submit and execute vbank/MsgSetDenomMetaData via governance')
```

- Creates a governance proposal with test denom metadata
- Submits the proposal using `agd tx gov submit-proposal`
- Votes on the proposal with multiple governance addresses
- Waits for the proposal to pass
- Verifies metadata was correctly set in the bank module
- Validates all metadata fields (description, denom_units, base, display, name,
  symbol, uri, uri_hash)

#### 3. Update Existing Metadata

```javascript
test.serial('can update existing denom metadata via governance')
```

- Sets initial metadata via governance proposal
- Submits second proposal to update the metadata
- Verifies the metadata was successfully updated

#### 4. Invalid Metadata Validation

```javascript
test.serial('SetDenomMetaData with invalid metadata fails validation')
```

- Attempts to submit proposal with invalid metadata (base not in denom_units)
- Verifies that validation fails before submission

## Running the Tests

### Prerequisites

```bash
cd /Users/mfig/agoric/agoric-sdk
yarn install
yarn build
```

### Run Phase 1 Tests (Before Upgrade)

```bash
cd a3p-integration/proposals/m:before-upgrade-next
yarn ava test/vbank-msg-absence.test.js
```

### Run Phase 2 Tests (After Upgrade)

```bash
cd a3p-integration/proposals/z:acceptance
yarn ava test/vbank-setdenommetadata.test.js
```

### Run All Tests in Proposal

The tests are automatically included in the proposal test scripts:

```bash
# For m:before-upgrade-next
cd a3p-integration/proposals/m:before-upgrade-next
./test.sh

# For z:acceptance
cd a3p-integration/proposals/z:acceptance
./test.sh
```

## Integration with CI

These tests will run automatically as part of the a3p-integration pipeline:

1. **m:before-upgrade-next** runs before the chain software upgrade
2. **n:upgrade-next** performs the chain upgrade
3. **z:acceptance** runs after all upgrades and proposals

## Example Proposal JSON

The test creates governance proposals with this structure:

```json
{
  "messages": [
    {
      "@type": "/agoric.vbank.MsgSetDenomMetaData",
      "authority": "agoric10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3",
      "metadata": {
        "description": "Test VBank Token for governance testing",
        "denom_units": [
          {
            "denom": "utestvbank",
            "exponent": 0,
            "aliases": []
          },
          {
            "denom": "testvbank",
            "exponent": 6,
            "aliases": ["TESTVBANK", "TVB"]
          }
        ],
        "base": "utestvbank",
        "display": "testvbank",
        "name": "Test VBank Token",
        "symbol": "TVB",
        "uri": "https://agoric.com",
        "uri_hash": "test-hash-123"
      }
    }
  ],
  "metadata": "ipfs://test-metadata-cid",
  "deposit": "10000000ubld",
  "title": "Set Test VBank Denom Metadata",
  "summary": "Test the vbank/MsgSetDenomMetaData governance message",
  "expedited": false
}
```

## Validation Criteria

### Phase 1 Success Criteria

- ✅ Test confirms message type does not exist
- ✅ Proposal submission fails with appropriate error
- ✅ No false positives

### Phase 2 Success Criteria

- ✅ Can query existing denom metadata
- ✅ Can submit governance proposal with `vbank/MsgSetDenomMetaData`
- ✅ Proposal passes after voting
- ✅ Denom metadata is correctly set in bank module
- ✅ All metadata fields match proposal values
- ✅ Can update existing metadata
- ✅ Invalid metadata fails validation

## Related Files

- **Proto Definition**: `golang/cosmos/proto/agoric/vbank/msgs.proto`
- **Implementation**: `golang/cosmos/x/vbank/keeper/msg_server.go`
- **Unit Tests**: `golang/cosmos/x/vbank/keeper/msg_server_test.go`

## Notes

- The governance module address
  (`agoric10d07y265gmmuvt4z0w9aw880jnsr700j6z2zm3`) is the required authority
  for `vbank/MsgSetDenomMetaData`
- Proposals require a deposit of 10,000,000 ubld (10 BLD)
- The tests use `retryUntilCondition` to wait for proposals to pass
- Tests clean up temporary files after execution
- Test denoms use the prefix `utestvbank` to avoid conflicts with production
  denoms
