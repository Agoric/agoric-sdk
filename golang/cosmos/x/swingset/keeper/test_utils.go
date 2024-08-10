package keeper

import (
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
)

// GetVstorageKeeper returns the vstorage keeper from the swingset keeper
// for testing purposes.
func GetVstorageKeeper(t *testing.T, k Keeper) vstorage.Keeper {
	if t == nil {
		panic("this function is reserved for testing")
	}
	return k.vstorageKeeper
}
