package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	ModuleName = "loc"
	StoreKey   = ModuleName
	RouterKey  = ModuleName
)

func LocByAddressKey(addr sdk.AccAddress) []byte {
	return addr.Bytes()
}

func LocByAddressDecodeKey(key []byte) sdk.AccAddress {
	return sdk.AccAddress(key)
}
