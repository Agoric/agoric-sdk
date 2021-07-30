package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
)

type AccountWrapper struct {
	Wrap   func(authtypes.AccountI) authtypes.AccountI
	Unwrap func(authtypes.AccountI) authtypes.AccountI
}

func identWrap(a authtypes.AccountI) authtypes.AccountI {
	return a
}

var defaultAccountWrapper = AccountWrapper{
	Wrap:   identWrap,
	Unwrap: identWrap,
}

// WrappedAccountKeeper wraps an authtypes.AccountKeeper to wrap the
// unmarshaled accounts via an AccountWrapper.
type WrappedAccountKeeper struct {
	authkeeper.AccountKeeper
	AccountWrapper
}

var _ authkeeper.AccountKeeper = (*WrappedAccountKeeper)(nil)

func NewWrappedAccountKeeper(ak authkeeper.AccountKeeper) *WrappedAccountKeeper {
	return &WrappedAccountKeeper{
		AccountKeeper:  ak,
		AccountWrapper: defaultAccountWrapper,
	}
}

func (wak *WrappedAccountKeeper) GetAccount(ctx sdk.Context, address sdk.AccAddress) authtypes.AccountI {
	acc := wak.AccountKeeper.GetAccount(ctx, address)
	if acc == nil {
		return nil
	}
	return wak.Wrap(acc)
}

func (wak *WrappedAccountKeeper) IterateAccounts(ctx sdk.Context, cb func(account authtypes.AccountI) (stop bool)) {
	wak.AccountKeeper.IterateAccounts(ctx, func(acc authtypes.AccountI) (stop bool) {
		return cb(wak.Wrap(acc))
	})
}

// XXX might also need to wrap AccountKeeper.Accounts()

func (wak *WrappedAccountKeeper) SetAccount(ctx sdk.Context, acc authtypes.AccountI) {
	unwrappedAcc := wak.Unwrap(acc)
	wak.AccountKeeper.SetAccount(ctx, unwrappedAcc)
}

func (wak *WrappedAccountKeeper) SetWrapper(aw AccountWrapper) {
	wak.AccountWrapper = aw
}
