package keeper

import (
	"fmt"

	agsdk "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	lientypes "github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/loc/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdkerrors "github.com/cosmos/cosmos-sdk/types/errors"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"
)

const (
// paramsKey = "params"
)

var (
	ErrStaleState = fmt.Errorf("stale state")
	coinsLTE      = agsdk.CoinsLTE
	excess        = agsdk.CoinsExcess
)

type Keeper interface {
	// Config and Genesis

	// Storage
	GetLoc(ctx sdk.Context, addr sdk.AccAddress) types.Loc
	GetParams(ctx sdk.Context) types.Params
	IterateLoc(ctx sdk.Context, cb func(addr sdk.AccAddress, loc types.Loc) bool)
	SetLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) error
	SetParams(ctx sdk.Context, params types.Params)

	// Operations
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
		return ErrStaleState
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

// validateLocRatio returns any error for before-and-after LoC state with the given ratio.
// The check is that the new loan must be at or below the maximum loan allowed by the
// ratio of loan per collateral when either the loan increases or the collateral decreases.
// The implementation must handle a change in denomination of either loan or collateral.
// The ratio is given in terms of loan per unit of collateral, which must be the bondDenom.
func validateLocRatio(old, new types.Loc, ratio sdk.DecCoin, bondDenom string) error {
	oldLoan := sdk.NewCoins(*old.Loan)
	oldColl := sdk.NewCoins(*old.Collateral)
	newLoan := sdk.NewCoins(*new.Loan)
	newColl := sdk.NewCoins(*new.Collateral)
	maxLoan := sdk.NewCoins()
	if new.Collateral.Denom == bondDenom {
		// only use the ratio if the collateral is of the right denom
		maxLoan = sdk.NewCoins(sdk.NewCoin(ratio.Denom, ratio.Amount.Mul(new.Collateral.Amount.ToDec()).RoundInt()))
	}
	if !coinsLTE(newLoan, oldLoan) || !coinsLTE(oldColl, newColl) {
		if !coinsLTE(newLoan, maxLoan) {
			return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFunds, "maximum loan amount is %s", maxLoan)
		}
	}
	return nil
}

// available returns the amount available for transfer, i.e. unbonded, unlocked, and unliened.
func available(balances lientypes.AccountState) sdk.Coins {
	unbonded := excess(balances.Total, balances.Bonded.Add(balances.Unbonding...))
	unliened := excess(balances.Total, balances.Liened)
	unlocked := excess(balances.Total, balances.Locked)
	return agsdk.CoinsMin(agsdk.CoinsMin(unbonded, unliened), unlocked)
}

func validateLocBalances(old, new types.Loc, balances lientypes.AccountState) error {
	oldLoan := sdk.NewCoins(*old.Loan)
	oldColl := sdk.NewCoins(*old.Collateral)
	newLoan := sdk.NewCoins(*new.Loan)
	newColl := sdk.NewCoins(*new.Collateral)
	if !coinsLTE(newColl, oldColl) {
		// ensure new collateral is lien-friendly
		// (will also be checked when setting the lien)
		if !coinsLTE(newColl, balances.Bonded) {
			return sdkerrors.Wrapf(sdkerrors.ErrInvalidCoins, "insufficient bonded tokens, need at least %s", newColl)
		}
	}
	if !coinsLTE(oldLoan, newLoan) {
		// ensure we can burn coins to pay for decreasing the loan
		repayment := excess(oldLoan, newLoan)
		if !coinsLTE(repayment, available(balances)) {
			return sdkerrors.Wrapf(sdkerrors.ErrInsufficientFunds, "need at least %s", repayment)
		}
	}
	return nil
}

// updateLocEffects adjusts the lien and burns or mints loan coins as needed
// Returns the actual new Loc, which might be different than the request in case
// of a failure when performing the effects, though these failures shouldn't happen.
func (k keeperImpl) updateLocEffects(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) (types.Loc, error) {
	// try to update lien
	if err := k.lienKeeper.UpdateLien(ctx, addr, lientypes.Lien{Coins: sdk.NewCoins(*newLoc.Collateral)}); err != nil {
		return oldLoc, err
	}

	oldLoan := sdk.NewCoins(*oldLoc.Loan)
	newLoan := sdk.NewCoins(*newLoc.Loan)

	// burn coins to reduce the loan
	repayment := excess(oldLoan, newLoan)
	if !repayment.IsZero() {
		err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, addr, types.ModuleName, repayment)
		if err != nil {
			// we updated the collateral but not the loan
			return types.Loc{Collateral: newLoc.Collateral, Loan: oldLoc.Loan}, err
		}
		err = k.bankKeeper.BurnCoins(ctx, types.ModuleName, repayment)
		if err != nil {
			// Note: should not fail, since we just obtained the coins
			panic(err)
		}
		oldLoan = oldLoan.Sub(repayment) // needed in case of failure during loan extension
	}

	// mint coins for increasing the loan
	increase := excess(newLoan, oldLoan)
	if !increase.IsZero() {
		err := k.bankKeeper.MintCoins(ctx, types.ModuleName, increase)
		if err == nil {
			err = k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, addr, increase)
			// Note: should not fail, since we just minted the coins
		}
		if err != nil {
			// If we failed to mint and give new coins, maintain oldLoan.
			// Using sdk.Coins simplified the handling of a change in the loan
			// denom ... until now, where we have to project the un-increased
			// loan down to a single denom. However, if we've gotten to this
			// point in a change-of-denom case, the old denom should be fully
			// repaid. So we can safely project to the new denom.
			denom := newLoc.Loan.Denom
			remainingLoan := sdk.NewCoin(denom, oldLoan.AmountOf(denom))
			if !agsdk.CoinsEq(sdk.NewCoins(remainingLoan), oldLoan) {
				// Despite the above argument, we have failed the check.
				panic(fmt.Sprintf("remaining loan should have only %s but is %s", denom, oldLoan))
			}
			return types.Loc{Collateral: newLoc.Collateral, Loan: &remainingLoan}, err
		}
	}
	return newLoc, nil
}

func (k keeperImpl) UpdateLoc(ctx sdk.Context, addr sdk.AccAddress, oldLoc, newLoc types.Loc) error {
	params := k.GetParams(ctx)
	ratio := params.StandaloneRatio // loan amount per collateral
	bondDenom := k.lienKeeper.BondDenom(ctx)
	if ratio == nil {
		return ErrStandaloneLocDisabled
	}

	if err := validateLocRatio(oldLoc, newLoc, *ratio, bondDenom); err != nil {
		return err
	}

	state := k.lienKeeper.GetAccountState(ctx, addr)
	if err := validateLocBalances(oldLoc, newLoc, state); err != nil {
		return err
	}

	modLoc, err := k.updateLocEffects(ctx, addr, oldLoc, newLoc)
	k.SetLoc(ctx, addr, oldLoc, modLoc)
	return err
}
