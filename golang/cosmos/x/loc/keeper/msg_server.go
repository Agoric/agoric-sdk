package keeper

import (
	"context"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
)

var (
	ErrStandaloneLocDisabled = fmt.Errorf("stadalone line of credit is disabled")
)

type msgServer struct {
	keeper Keeper
}

func NewMsgServerImpl(keeper Keeper) types.MsgServer {
	return &msgServer{keeper: keeper}
}

func (ms msgServer) UpdateLoc(goCtx context.Context, msg *types.MsgUpdateLoc) (*types.MsgUpdateLocResponse, error) {
	keeper := ms.keeper
	ctx := sdk.UnwrapSDKContext(goCtx)
	addr, err := sdk.AccAddressFromBech32(msg.GetAddress())
	if err != nil {
		panic(err) // should have been picked up in static checks
	}
	params := keeper.GetParams(ctx)
	ratio := params.StandaloneRatio
	if ratio == nil {
		return nil, ErrStandaloneLocDisabled
	}

	oldLoc := keeper.GetLoc(ctx, addr)
	newLoc := types.Loc{
		Collateral: msg.Collateral,
		Loan:       msg.Loan,
	}

	if err = keeper.UpdateLoc(ctx, addr, oldLoc, newLoc); err != nil {
		return nil, err
	}

	return &types.MsgUpdateLocResponse{}, nil
}

func (ms msgServer) UpdateLocLoan(goCtx context.Context, msg *types.MsgUpdateLocLoan) (*types.MsgUpdateLocLoanResponse, error) {
	keeper := ms.keeper
	ctx := sdk.UnwrapSDKContext(goCtx)
	addr, err := sdk.AccAddressFromBech32(msg.GetAddress())
	if err != nil {
		panic(err) // should have been picked up in static checks
	}
	params := keeper.GetParams(ctx)
	ratio := params.StandaloneRatio
	if ratio == nil {
		return nil, ErrStandaloneLocDisabled
	}

	oldLoc := keeper.GetLoc(ctx, addr)
	newLoc := types.Loc{
		Collateral: oldLoc.Collateral,
		Loan:       msg.Loan,
	}

	if err := keeper.UpdateLoc(ctx, addr, oldLoc, newLoc); err != nil {
		return nil, err
	}

	return &types.MsgUpdateLocLoanResponse{}, nil
}
