package keeper

import (
	"context"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Querier is used as Keeper will have duplicate methods if used directly, and gRPC names take precedence over keeper
type Querier struct {
	Keeper
}

var _ types.QueryServer = Querier{}

func (k Querier) Data(c context.Context, req *types.QueryDataRequest) (*types.QueryDataResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	entry := k.GetEntry(ctx, req.Path)

	return &types.QueryDataResponse{
		Value: entry.StringValue(),
	}, nil
}

func (k Querier) Children(c context.Context, req *types.QueryChildrenRequest) (*types.QueryChildrenResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	children := k.GetChildren(ctx, req.Path)

	return &types.QueryChildrenResponse{
		Children: children.Children,
	}, nil
}
