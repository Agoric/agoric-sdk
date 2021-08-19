package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	ModuleName = "lien"

	StoreKey = ModuleName
)

var (
	LienByAddressPrefix = []byte{0x01}
)

// The lien-by-address space maps prefixed addresses to Lien messages.
// The keys are raw address bytes with the appropriate prefix.
// THe data are protobuf-encoded Lien messages.

// LienByAddressKey
func LienByAddressKey(addr sdk.AccAddress) []byte {
	return append(LienByAddressPrefix, addr.Bytes()...)
}

func LienByAddressDecodeKey(key []byte) sdk.AccAddress {
	return sdk.AccAddress(key[len(LienByAddressPrefix):])
}
