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
	// KeyLastSequence is the key used to store the last sequence (big-endian
	// uint64) to help derive a fresh module account address
	KeyLastSequence = []byte("lastSequence")
)

// NextSequence interprets the value byte slice as a big-endian uint64, and
// returns a new big-endian byte slice representing the value plus 1.
func NextSequence(value []byte) []byte {
	lastSequence := sdk.BigEndianToUint64(value)
	lastSequence += 1
	return sdk.Uint64ToBigEndian(lastSequence)
}
