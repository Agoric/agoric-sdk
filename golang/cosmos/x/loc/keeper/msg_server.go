package keeper

import (
	"context"
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"

	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
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

/*
A new LoC state is valid if:



*/

func (ms msgServer) validateCollateral(ctx sdk.Context, collateral sdk.Coin) error {
	bondDenom := ms.keeper.BondDenom(ctx)
	if collateral.Denom != bondDenom {
		return sdkerrors.Wrapf(sdkerrors.ErrInvalidCoins, "collateral denom %s should be bond denom %s", collateral.Denom, bondDenom)
	}
	return nil
}

func (ms msgServer) UpdateLoc(goCtx context.Context, msg *types.MsgUpdateLoc) (*types.MsgUpdateLocResponse, error) {
	keeper := ms.keeper
	ctx := sdk.UnwrapSDKContext(goCtx)
	addr, err := sdk.AccAddressFromBech32(msg.GetAddress())
	if err != nil {
		panic(err) // should have been picked up in static checks
	}
	params := keeper.GetParams(ctx)
	ratio := params.StandaloneRatio // loan amount per collateral
	if ratio == nil {
		return nil, ErrStandaloneLocDisabled
	}

	// can always zero out the
	// check collateral denomination
	if err := ms.validateCollateral(ctx, *msg.Collateral); err != nil {
		return nil, err
	}
	maxLoan := ratio.Amount.Mul(msg.Collateral.Amount.ToDec()).RoundInt()

	// check loan
	collateralAmt := msg.NewLoan.Amount.ToDec().QuoRoundUp(ratio.Amount).RoundInt()
	stakingDenom := keeper.BondDenom(ctx)
	collateral := sdk.NewCoin(stakingDenom, collateralAmt)
	newLoc := types.Loc{
		Collateral: &collateral,
		Loan:       msg.NewLoan,
	}

	err = keeper.UpdateLoc(ctx, addr, *msg.CurrentLoc, newLoc)
	if err != nil {
		return nil, err
	}
	return &types.MsgUpdateStandaloneLocResponse{}, nil
}
