package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	ModuleName = "lien"

	StoreKey = ModuleName
)

// The lien-by-address space maps addresses to Lien messages.
// The keys are raw address bytes.
// THe data are protobuf-encoded Lien messages.

// LienByAddressKey returns the lien lookup key for the addr.
func LienByAddressKey(addr sdk.AccAddress) []byte {
	return addr.Bytes()
}

// LienByAddressDecodeKey returns the address for the lien lookup key.
func LienByAddressDecodeKey(key []byte) sdk.AccAddress {
	return sdk.AccAddress(key)
}
