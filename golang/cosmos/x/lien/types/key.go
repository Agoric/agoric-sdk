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

func LienByAddressKey(addr sdk.AccAddress) []byte {
	return append(LienByAddressPrefix, addr.Bytes()...)
}
