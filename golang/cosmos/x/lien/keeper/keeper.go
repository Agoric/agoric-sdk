package keeper

import (
	"fmt"
	"math"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/lien/types"

	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"
	vestexported "github.com/cosmos/cosmos-sdk/x/auth/vesting/exported"
	stakingTypes "github.com/cosmos/cosmos-sdk/x/staking/types"

	vm "github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

type Keeper interface {
	GetAccountWrapper() types.AccountWrapper
	GetLien(ctx sdk.Context, addr sdk.AccAddress) types.Lien
	SetLien(ctx sdk.Context, addr sdk.AccAddress, lien types.Lien)
	IterateLiens(ctx sdk.Context, cb func(addr sdk.AccAddress, lien types.Lien) bool)
	ChangeLien(ctx sdk.Context, addr sdk.AccAddress, denom string, delta sdk.Int) (sdk.Int, error)
	GetAccountState(ctx sdk.Context, addr sdk.AccAddress) types.AccountState
	BondDenom(ctx sdk.Context) string
	GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins
	GetDelegatorDelegations(ctx sdk.Context, delegator sdk.AccAddress, maxRetrieve uint16) []stakingTypes.Delegation
	GetValidator(ctx sdk.Context, valAddr sdk.ValAddress) (stakingTypes.Validator, bool)
}

// keeperImpl implements the lien keeper.
// The accountKeeper field must be the same one that the bankKeeper and
// stakingKeeper use.
type keeperImpl struct {
	key sdk.StoreKey
	cdc codec.Codec

	accountKeeper *types.WrappedAccountKeeper
	bankKeeper    types.BankKeeper
	stakingKeeper types.StakingKeeper

	pushAction vm.ActionPusher
}

// NewKeeper returns a new Keeper.
// The ak must be the same accout keeper that the bk and sk use.
func NewKeeper(cdc codec.Codec, key sdk.StoreKey, ak *types.WrappedAccountKeeper, bk types.BankKeeper, sk types.StakingKeeper,
	pushAction vm.ActionPusher) Keeper {
	return keeperImpl{
		key:           key,
		cdc:           cdc,
		accountKeeper: ak,
		bankKeeper:    bk,
		stakingKeeper: sk,
		pushAction:    pushAction,
	}
}

// GetAccountWrapper returns an AccountWrapper that wrap/unwrap accounts
// with lienAccount specifying this keeper.
func (lk keeperImpl) GetAccountWrapper() types.AccountWrapper {
	return NewAccountWrapper(lk)
}

// GetLien returns the lien stored for an account.
// Defaults to a lien of zero.
func (lk keeperImpl) GetLien(ctx sdk.Context, addr sdk.AccAddress) types.Lien {
	store := ctx.KVStore(lk.key)
	bz := store.Get(types.LienByAddressKey(addr))
	if bz == nil {
		return types.Lien{}
	}
	var lien types.Lien
	lk.cdc.MustUnmarshal(bz, &lien)
	return lien
}

// SetLien sets the lien stored for an account.
// Deletes the entry if the new lien is zero.
func (lk keeperImpl) SetLien(ctx sdk.Context, addr sdk.AccAddress, lien types.Lien) {
	store := ctx.KVStore(lk.key)
	key := types.LienByAddressKey(addr)
	if lien.Coins.IsZero() {
		store.Delete(key)
		return
	}
	bz := lk.cdc.MustMarshal(&lien)
	store.Set(key, bz)
}

// IterateLiens calls cb() on all nonzero liens in the store.
// Stops early if cb() returns true.
func (lk keeperImpl) IterateLiens(ctx sdk.Context, cb func(addr sdk.AccAddress, lien types.Lien) bool) {
	store := ctx.KVStore(lk.key)
	iterator := store.Iterator(nil, nil)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		addr := types.LienByAddressDecodeKey(iterator.Key())
		var lien types.Lien
		lk.cdc.MustUnmarshal(iterator.Value(), &lien)
		if cb(addr, lien) {
			break
		}
	}
}

// ChangeLien changes the liened amount of a single denomination in the given account.
// Either the old or new amount of the denomination can be zero.
// Liens can always be decreased, but to increase a lien, the new total amount must
// be vested and either bonded (for the staking token) or in the bank (for other tokens).
// The total lien can have several different denominations. Each is adjusted
// independently.
//
// The delta is given as a raw Int instead of a Coin since it may be negative.
func (lk keeperImpl) ChangeLien(ctx sdk.Context, addr sdk.AccAddress, denom string, delta sdk.Int) (sdk.Int, error) {
	oldLien := lk.GetLien(ctx, addr)
	oldCoins := oldLien.Coins
	oldAmt := oldCoins.AmountOf(denom)
	if delta.IsZero() {
		// no-op, no need to do anything
		return oldAmt, nil
	}
	newAmt := oldAmt.Add(delta)
	if newAmt.IsNegative() {
		return oldAmt, fmt.Errorf("lien delta of %s is larger than existing balance %s", delta, oldAmt)
	}
	newCoin := sdk.NewCoin(denom, newAmt)
	newCoins := oldCoins.Sub(sdk.NewCoins(sdk.NewCoin(denom, oldAmt))).Add(newCoin)
	newLien := types.Lien{
		Coins:     newCoins,
		Delegated: oldLien.Delegated,
	}

	if delta.IsPositive() {
		// See if it's okay to increase the lien.
		// Lien can be increased if the new amount is vested,
		// not already liened, and if it's the bond denom,
		// must be staked.
		state := lk.GetAccountState(ctx, addr)
		if denom == lk.BondDenom(ctx) {
			bonded := state.Bonded.AmountOf(denom)
			unvested := state.Unvested.AmountOf(denom)
			if !newAmt.Add(unvested).LTE(bonded) {
				return oldAmt, fmt.Errorf("want to lien %s but only %s vested and bonded", newCoin, bonded.Sub(unvested))
			}
			newDelegated := bonded.Add(state.Unbonding.AmountOf(denom))
			newLien.Delegated = sdk.NewCoins(sdk.NewCoin(denom, newDelegated))
		} else {
			inBank := lk.bankKeeper.GetBalance(ctx, addr, denom)
			if !newAmt.LTE(inBank.Amount) {
				return oldAmt, fmt.Errorf("want to lien %s but only %s available", newCoin, inBank)
			}
		}
	}
	lk.SetLien(ctx, addr, newLien)
	return newAmt, nil
}

// GetAccountState retrieves the AccountState for addr.
func (lk keeperImpl) GetAccountState(ctx sdk.Context, addr sdk.AccAddress) types.AccountState {
	bonded := lk.getBonded(ctx, addr)
	unbonding := lk.getUnbonding(ctx, addr)
	locked, unvested := lk.getLockedUnvested(ctx, addr)
	liened := lk.GetLien(ctx, addr).Coins
	total := lk.bankKeeper.GetAllBalances(ctx, addr).Add(bonded...).Add(unbonding...)
	return types.AccountState{
		Total:     total,
		Bonded:    bonded,
		Unbonding: unbonding,
		Locked:    locked,
		Liened:    liened,
		Unvested:  unvested,
	}
}

// getBonded returns the bonded tokens delegated by addr.
func (lk keeperImpl) getBonded(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	bonded := sdk.NewCoins()
	delegations := lk.stakingKeeper.GetDelegatorDelegations(ctx, addr, math.MaxUint16)
	for _, d := range delegations {
		validatorAddr, err := sdk.ValAddressFromBech32(d.ValidatorAddress)
		if err != nil {
			panic(err)
		}
		validator, found := lk.stakingKeeper.GetValidator(ctx, validatorAddr)
		if !found {
			panic("validator not found")
		}
		shares := d.GetShares()
		tokens := validator.TokensFromShares(shares)
		bonded = bonded.Add(sdk.NewCoin(lk.stakingKeeper.BondDenom(ctx), tokens.RoundInt())) // XXX rounding?
	}
	return bonded
}

// getUnbonding returns the unbonding tokens delegated by addr.
func (lk keeperImpl) getUnbonding(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	unbonding := sdk.NewCoins()
	unbondings := lk.stakingKeeper.GetUnbondingDelegations(ctx, addr, math.MaxUint16)
	for _, u := range unbondings {
		amt := sdk.NewInt(0)
		for _, e := range u.Entries {
			amt = amt.Add(e.Balance)
		}
		unbonding = unbonding.Add(sdk.NewCoin(lk.stakingKeeper.BondDenom(ctx), amt))
	}
	return unbonding
}

// getLocked returns the number of locked tokens in account addr.
// This reflects the VestingCoins in the underlying VestingAccount,
// if any, not the LienAccount wrapping it.
func (lk keeperImpl) getLockedUnvested(ctx sdk.Context, addr sdk.AccAddress) (sdk.Coins, sdk.Coins) {
	account := lk.accountKeeper.GetAccount(ctx, addr)
	if account == nil {
		// account doesn't exist
		return sdk.NewCoins(), sdk.NewCoins()
	}
	if lienAccount, ok := account.(LienAccount); ok {
		// unwrap the lien wrapper
		account = lienAccount.omniClawbackAccount
	}
	if clawbackAccount, ok := account.(vestexported.ClawbackVestingAccountI); ok {
		original := clawbackAccount.GetOriginalVesting()
		unlocked := clawbackAccount.GetUnlockedOnly(ctx.BlockTime())
		vested := clawbackAccount.GetVestedOnly(ctx.BlockTime())
		return original.Sub(unlocked), original.Sub(vested)
	}
	if vestingAccount, ok := account.(vestexported.VestingAccount); ok {
		return vestingAccount.GetVestingCoins(ctx.BlockTime()), sdk.NewCoins()
	}
	return sdk.NewCoins(), sdk.NewCoins()
}

// The following methods simply proxy the eponymous staking keeper queries.

// BondDenom returns the denom used for staking.
func (lk keeperImpl) BondDenom(ctx sdk.Context) string {
	return lk.stakingKeeper.BondDenom(ctx)
}

func (lk keeperImpl) GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	return lk.bankKeeper.GetAllBalances(ctx, addr)
}

// GetDelegatorDelegations returns the delegator's delegations.
// Returns up to the specified number of delegations.
func (lk keeperImpl) GetDelegatorDelegations(ctx sdk.Context, delegator sdk.AccAddress, maxRetrieve uint16) []stakingTypes.Delegation {
	return lk.stakingKeeper.GetDelegatorDelegations(ctx, delegator, maxRetrieve)
}

// GetValidator returns the named validator, if found.
func (lk keeperImpl) GetValidator(ctx sdk.Context, valAddr sdk.ValAddress) (stakingTypes.Validator, bool) {
	return lk.stakingKeeper.GetValidator(ctx, valAddr)
}
