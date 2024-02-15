package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
)

const (
	// module name
	ModuleName = "vlocalchain"

	// StoreKey to be used when creating the KVStore
	StoreKey = ModuleName
)

var (
	// KeyLastSequence is the key used to store the last sequence for a new address
	KeyLastSequence = []byte("lastSequence")
)

func IncrementSequence(value []byte) []byte {
	lastSequence := sdk.BigEndianToUint64(value)
	lastSequence += 1
	return sdk.Uint64ToBigEndian(lastSequence)
}
