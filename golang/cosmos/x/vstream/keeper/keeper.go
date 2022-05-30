package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstream/types"
)

// StorageStreamKeeper defines an interface that allows streaming via a vstorage
// path.
type StorageStreamKeeper interface {
	StorageStreamUpdate(sdk sdk.Context, path string, value string) error
	StorageStreamFinish(sdk sdk.Context, path string, value string) error
	StorageStreamFailure(sdk sdk.Context, path string, err error) error
}

var _ StorageStreamKeeper = Keeper{}

type Keeper struct {
	storeKey       sdk.StoreKey
	vstorageKeeper vstorage.Keeper
}

// NewKeeper creates a new Keeper object with a StorageStreamKeeper
// corresponding to storeKey.  It is up to the caller either to use a fresh
// storeKey, or to supply a storeKey for an existing vstorageKeeper.
func NewKeeper(storeKey sdk.StoreKey) Keeper {
	vstorageKeeper := vstorage.NewKeeper(storeKey)
	return Keeper{storeKey, vstorageKeeper}
}

func (k Keeper) StorageStreamUpdate(ctx sdk.Context, path string, value string) error {
	state := types.NewVstorageStateRef(k.vstorageKeeper, path)
	return k.StreamUpdate(ctx, state, []byte(value))
}

func (k Keeper) StorageStreamFinish(ctx sdk.Context, path string, value string) error {
	state := types.NewVstorageStateRef(k.vstorageKeeper, path)
	return k.StreamFinish(ctx, state, []byte(value))
}

func (k Keeper) StorageStreamFailure(ctx sdk.Context, path string, failure error) error {
	state := types.NewVstorageStateRef(k.vstorageKeeper, path)
	return k.StreamFailure(ctx, state, failure)
}
