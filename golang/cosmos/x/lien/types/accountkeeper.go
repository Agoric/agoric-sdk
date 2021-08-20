package types

import (
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
)

// AccountWrapper wraps/unwraps accounts.
// The Wrap and Unwrap functions map accounts to accounts.
type AccountWrapper struct {
	Wrap   func(authtypes.AccountI) authtypes.AccountI
	Unwrap func(authtypes.AccountI) authtypes.AccountI
}

// identWrap is an identity mapping of accounts.
func identWrap(a authtypes.AccountI) authtypes.AccountI {
	return a
}

// DefaultAccountWrapper is an AccountWrapper that does nothing.
var DefaultAccountWrapper = AccountWrapper{
	Wrap:   identWrap,
	Unwrap: identWrap,
}

// WrappedAccountKeeper wraps an account AccountKeeper insert an outer wrapper
// to modify the behavior of stored accounts.
// Applies the Wrap function when reading accounts from the store and applies
// the Unwrap function when writing them to the store.
//
// Note that we do not wrap the Accounts() method since the returned accounts
// are serialized and sent in the GRPC response and we don't need to modify
// their behavior.
type WrappedAccountKeeper struct {
	authkeeper.AccountKeeper
	AccountWrapper
}

var _ authkeeper.AccountKeeper = (*WrappedAccountKeeper)(nil)

// NewWrappedAccountKeeper returns a WrappedAccountKeeper with the default (identity) wrapper.
func NewWrappedAccountKeeper(ak authkeeper.AccountKeeper) *WrappedAccountKeeper {
	return &WrappedAccountKeeper{
		AccountKeeper:  ak,
		AccountWrapper: DefaultAccountWrapper,
	}
}

// GetAccount implements AccountKeeper.GetAccount().
// It calls the embedded AccountKeeper then Wraps the account.
func (wak *WrappedAccountKeeper) GetAccount(ctx sdk.Context, address sdk.AccAddress) authtypes.AccountI {
	acc := wak.AccountKeeper.GetAccount(ctx, address)
	if acc == nil {
		return nil
	}
	return wak.Wrap(acc)
}

// IterateAccounts implements AccountKeeper.IterateAccounts().
// It calls the embedded AccountKeeper but Wraps the retrieved accounts.
func (wak *WrappedAccountKeeper) IterateAccounts(ctx sdk.Context, cb func(account authtypes.AccountI) (stop bool)) {
	wak.AccountKeeper.IterateAccounts(ctx, func(acc authtypes.AccountI) (stop bool) {
		return cb(wak.Wrap(acc))
	})
}

// SetAccount implements AccountKeeper.SetAccount().
// It Unwraps the account then calls the embedded AccountKeeper.
func (wak *WrappedAccountKeeper) SetAccount(ctx sdk.Context, acc authtypes.AccountI) {
	unwrappedAcc := wak.Unwrap(acc)
	wak.AccountKeeper.SetAccount(ctx, unwrappedAcc)
}

// SetWrapper updates the AcountWrapper.
// We need to modify the wrapper after it's created for the planned use,
// since there is a circular dependency in the creation of the WrappedAccountKeeper
// and the lien.Keeper.
func (wak *WrappedAccountKeeper) SetWrapper(aw AccountWrapper) {
	wak.AccountWrapper = aw
}
