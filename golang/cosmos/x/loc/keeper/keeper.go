package keeper

import (
	"fmt"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

const (
	paramsKey = "params"
)

var (
	StaleState = fmt.Errorf("stale state")
)

type Keeper interface {
	BondDenom(ctx sdk.Context) string
	GetLoc(ctx sdk.Context, addr sdk.AccAddress) types.Loc
	GetParams(ctx sdk.Context) types.Params
	IterateLoc(ctx sdk.Context, cb func(addr sdk.AccAddress, loc types.Loc) bool)
	SetLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) error
	SetParams(ctx sdk.Context, params types.Params)
	UpdateLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoC types.Loc) error
}

type keeperImpl struct {
	key        sdk.StoreKey
	cdc        codec.Codec
	paramSpace paramtypes.Subspace

	bankKeeper types.BankKeeper
	lienKeeper types.LienKeeper

	callToController func(ctx sdk.Context, str string) (string, error)
}

func NewKeeper(key sdk.StoreKey, cdc codec.Codec, paramSpace paramtypes.Subspace, bk types.BankKeeper, lk types.LienKeeper,
	callToController func(ctx sdk.Context, str string) (string, error)) Keeper {
	// set KeyTable if it has not already been set
	if !paramSpace.HasKeyTable() {
		paramSpace = paramSpace.WithKeyTable(types.ParamKeyTable())
	}

	return keeperImpl{
		key:              key,
		cdc:              cdc,
		paramSpace:       paramSpace,
		bankKeeper:       bk,
		lienKeeper:       lk,
		callToController: callToController,
	}
}

func (k keeperImpl) BondDenom(ctx sdk.Context) string {
	return k.lienKeeper.BondDenom(ctx)
}

func (k keeperImpl) GetLoc(ctx sdk.Context, addr sdk.AccAddress) types.Loc {
	store := ctx.KVStore(k.key)
	bz := store.Get(types.LocByAddressKey(addr))
	if bz == nil {
		return types.Loc{}
	}
	var loc types.Loc
	k.cdc.MustUnmarshal(bz, &loc)
	return loc
}

func (k keeperImpl) GetParams(ctx sdk.Context) (params types.Params) {
	k.paramSpace.GetParamSet(ctx, &params)
	return
}

func (k keeperImpl) IterateLoc(ctx sdk.Context, cb func(addr sdk.AccAddress, loc types.Loc) bool) {
	store := ctx.KVStore(k.key)
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		addr := types.LocByAddressDecodeKey(iterator.Key())
		var loc types.Loc
		k.cdc.MustUnmarshal(iterator.Value(), &loc)
		if cb(addr, loc) {
			break
		}
	}
}

func (k keeperImpl) SetLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) error {
	storedLoc := k.GetLoc(ctx, addr)
	if storedLoc != oldLoc {
		return StaleState
	}
	store := ctx.KVStore(k.key)
	key := types.LocByAddressKey(addr)
	emptyLoc := types.Loc{}
	if newLoc == emptyLoc {
		store.Delete(key)
		return nil
	}
	bz := k.cdc.MustMarshal(&newLoc)
	store.Set(key, bz)
	return nil
}

func (k keeperImpl) SetParams(ctx sdk.Context, params types.Params) {
	k.paramSpace.SetParamSet(ctx, &params)
}

func (k keeperImpl) UpdateLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) error {
	storedLoc := k.GetLoc(ctx, addr)
	if storedLoc != oldLoc {
		return StaleState
	}
	//curLoan := sdk.NewCoins(oldLoc.Loan)
	newLoan := sdk.NewCoins(*newLoc.Loan)
	if storedLoc.Loan.Amount.LT(newLoan.AmountOf(storedLoc.Loan.Denom)) {

	}
	return nil
}
