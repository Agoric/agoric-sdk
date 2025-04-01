package keeper

import (
	"context"

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

func (k Querier) Params(c context.Context, req *types.QueryParamsRequest) (*types.QueryParamsResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	params := k.GetParams(ctx)

	return &types.QueryParamsResponse{
		Params: params,
	}, nil
}

func (k Querier) Egress(c context.Context, req *types.QueryEgressRequest) (*types.QueryEgressResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	egress := k.GetEgress(ctx, req.Peer)
	if egress.Peer == nil {
		return nil, status.Error(codes.NotFound, "egress not found")
	}

	return &types.QueryEgressResponse{
		Egress: &egress,
	}, nil
}

func (k Querier) Mailbox(c context.Context, req *types.QueryMailboxRequest) (*types.QueryMailboxResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	value := k.GetMailbox(ctx, req.Peer.String())
	if value == "" {
		return nil, status.Error(codes.NotFound, "mailbox not found")
	}

	return &types.QueryMailboxResponse{
		Value: value,
	}, nil
}

func (k Querier) ChunkedArtifactStatus(c context.Context, req *types.QueryChunkedArtifactStatusRequest) (*types.QueryChunkedArtifactStatusResponse, error) {
	if req == nil {
		return nil, status.Error(codes.InvalidArgument, "empty request")
	}
	ctx := sdk.UnwrapSDKContext(c)

	msg := k.GetPendingBundleInstall(ctx, req.ChunkedArtifactId)
	if msg == nil {
		return nil, status.Error(codes.NotFound, "pending chunked artifact not found")
	}

	can := k.GetChunkedArtifactNode(ctx, req.ChunkedArtifactId)
	if can == nil {
		return nil, status.Error(codes.NotFound, "pending chunked artifact node not found")
	}

	return &types.QueryChunkedArtifactStatusResponse{
		ChunkedArtifactId: req.ChunkedArtifactId,
		ChunkedArtifact:   msg.ChunkedArtifact,
		StartTimeUnix:     can.StartTimeUnix,
		StartBlockHeight:  can.StartBlockHeight,
	}, nil
}
