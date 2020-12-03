package keeper

import (
	"context"
	"strings"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Querier is used as Keeper will have duplicate methods if used directly, and gRPC names take precedence over keeper
type Querier struct {
	Keeper
}

var _ types.QueryServer = Querier{}

func (k Querier) Storage(c context.Context, req *types.QueryStorageRequest) (*types.QueryStorageResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	storage := k.GetStorage(ctx, strings.Join(req.Path, "."))

	return &types.QueryStorageResponse{
		Value: storage.Value,
	}, nil
}

func (k Querier) Keys(c context.Context, req *types.QueryStorageKeysRequest) (*types.QueryStorageKeysResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	keys := k.GetKeys(ctx, strings.Join(req.Path, "."))

	return &types.QueryStorageKeysResponse{
		Keys: keys.Keys,
	}, nil
}

func (k Querier) Egress(c context.Context, req *types.QueryEgressRequest) (*types.Egress, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	egress := k.GetEgress(ctx, req.Peer)

	return &egress, nil
}

func (k Querier) Mailbox(c context.Context, req *types.QueryMailboxRequest) (*types.QueryStorageResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	mb := k.GetMailbox(ctx, req.Peer.String())

	return &types.QueryStorageResponse{
		Value: mb.Value,
	}, nil
}
