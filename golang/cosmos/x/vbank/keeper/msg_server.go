package keeper

import (
	"context"

	sdkioerrors "cosmossdk.io/errors"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	govtypes "github.com/cosmos/cosmos-sdk/x/gov/types"
)

type msgServer struct {
	Keeper
}

var _ types.MsgServer = msgServer{}

func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{Keeper: keeper}
}

func (k msgServer) UpdateParams(goCtx context.Context, msg *types.MsgUpdateParams) (*types.MsgUpdateParamsResponse, error) {
	ctx := sdk.UnwrapSDKContext(goCtx)

	if msg.Authority != k.authority {
		return nil, sdkioerrors.Wrapf(govtypes.ErrInvalidSigner, "invalid authority; expected %s, got %s", k.authority, msg.Authority)
	}
	if err := msg.Params.ValidateBasic(); err != nil {
		return nil, err
	}

	k.SetParams(ctx, msg.Params)
	return &types.MsgUpdateParamsResponse{}, nil
}
