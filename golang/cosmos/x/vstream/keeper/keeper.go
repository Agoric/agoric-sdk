package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
)

type Publisher interface {
	PublishUpdate(sdk sdk.Context, path string, value string)
	PublishFinish(sdk sdk.Context, path string, value string)
	PublishFail(sdk sdk.Context, path string, err error)
}

var _ Publisher = Keeper{}

type Keeper struct {
	storeKey       sdk.StoreKey
	vstorageKeeper vstorage.Keeper
}

func NewKeeper(storeKey sdk.StoreKey) Keeper {
	vstorageKeeper := vstorage.NewKeeper(storeKey)
	return Keeper{storeKey, vstorageKeeper}
}

func (k Keeper) PublishUpdate(ctx sdk.Context, path string, value string) {
	NewUpdatePublishRequest(ctx, k, path, []byte(value)).Commit(ctx)
}

func (k Keeper) PublishFinish(ctx sdk.Context, path string, value string) {
	NewFinishPublishRequest(ctx, k, path, []byte(value)).Commit(ctx)
}

func (k Keeper) PublishFail(ctx sdk.Context, path string, err error) {
	NewFailPublishRequest(ctx, k, path, err).Commit(ctx)
}
