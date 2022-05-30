package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage"
)

type PathPublisher interface {
	PublishUpdate(sdk sdk.Context, path string, value string) error
	PublishFinish(sdk sdk.Context, path string, value string) error
	PublishFail(sdk sdk.Context, path string, err error) error
}

var _ PathPublisher = Keeper{}

type Keeper struct {
	storeKey       sdk.StoreKey
	vstorageKeeper vstorage.Keeper
}

func NewKeeper(storeKey sdk.StoreKey) Keeper {
	vstorageKeeper := vstorage.NewKeeper(storeKey)
	return Keeper{storeKey, vstorageKeeper}
}

func (k Keeper) PublishUpdate(ctx sdk.Context, path string, value string) error {
	pr := NewUpdatePublishRequest(ctx, k, path, []byte(value))
	prior, err := pr.GetPriorFromPath(ctx, path)
	if err != nil {
		return err
	}
	return pr.Commit(ctx, *prior)
}

func (k Keeper) PublishFinish(ctx sdk.Context, path string, value string) error {
	pr := NewFinishPublishRequest(ctx, k, path, []byte(value))
	prior, err := pr.GetPriorFromPath(ctx, path)
	if err != nil {
		return err
	}
	return pr.Commit(ctx, *prior)
}

func (k Keeper) PublishFail(ctx sdk.Context, path string, failure error) error {
	pr := NewFailPublishRequest(ctx, k, path, failure)
	prior, err := pr.GetPriorFromPath(ctx, path)
	if err != nil {
		return err
	}
	return pr.Commit(ctx, *prior)
}
