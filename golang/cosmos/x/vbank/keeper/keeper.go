package keeper

import (
	"github.com/cosmos/cosmos-sdk/codec"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	authtypes "github.com/cosmos/cosmos-sdk/x/auth/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	vm "github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

const stateKey string = "state"

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey   storetypes.StoreKey
	cdc        codec.Codec
	paramSpace paramtypes.Subspace

	accountKeeper         types.AccountKeeper
	bankKeeper            types.BankKeeper
	rewardDistributorName string
	PushAction            vm.ActionPusher
}

// NewKeeper creates a new vbank Keeper instance
func NewKeeper(
	cdc codec.Codec, key storetypes.StoreKey, paramSpace paramtypes.Subspace,
	accountKeeper types.AccountKeeper, bankKeeper types.BankKeeper,
	rewardDistributorName string,
	pushAction vm.ActionPusher,
) Keeper {

	// set KeyTable if it has not already been set
	if !paramSpace.HasKeyTable() {
		paramSpace = paramSpace.WithKeyTable(types.ParamKeyTable())
	}

	return Keeper{
		storeKey:              key,
		cdc:                   cdc,
		paramSpace:            paramSpace,
		accountKeeper:         accountKeeper,
		bankKeeper:            bankKeeper,
		rewardDistributorName: rewardDistributorName,
		PushAction:            pushAction,
	}
}

func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

func (k Keeper) GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	return k.bankKeeper.GetAllBalances(ctx, addr)
}

func (k Keeper) StoreRewardCoins(ctx sdk.Context, amt sdk.Coins) error {
	return k.bankKeeper.MintCoins(ctx, types.ModuleName, amt)
}

func (k Keeper) SendCoinsToRewardDistributor(ctx sdk.Context, amt sdk.Coins) error {
	return k.bankKeeper.SendCoinsFromModuleToModule(ctx, types.ModuleName, k.rewardDistributorName, amt)
}

func (k Keeper) SendCoins(ctx sdk.Context, addr sdk.AccAddress, amt sdk.Coins) error {
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, amt); err != nil {
		return err
	}
	return k.bankKeeper.SendCoinsFromModuleToAccount(ctx, types.ModuleName, addr, amt)
}

func (k Keeper) GrabCoins(ctx sdk.Context, addr sdk.AccAddress, amt sdk.Coins) error {
	if err := k.bankKeeper.SendCoinsFromAccountToModule(ctx, addr, types.ModuleName, amt); err != nil {
		return err
	}
	return k.bankKeeper.BurnCoins(ctx, types.ModuleName, amt)
}

func (k Keeper) GetModuleAccountAddress(ctx sdk.Context, name string) sdk.AccAddress {
	acct := k.accountKeeper.GetModuleAccount(ctx, name)
	if acct == nil {
		return nil
	}
	return acct.GetAddress()
}

func (k Keeper) IsModuleAccount(ctx sdk.Context, addr sdk.AccAddress) bool {
	acc := k.accountKeeper.GetAccount(ctx, addr)
	if acc == nil {
		return false
	}
	_, ok := acc.(authtypes.ModuleAccountI)
	return ok
}

func (k Keeper) GetParams(ctx sdk.Context) (params types.Params) {
	k.paramSpace.GetParamSet(ctx, &params)
	return params
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	k.paramSpace.SetParamSet(ctx, &params)
}

func (k Keeper) GetState(ctx sdk.Context) types.State {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get([]byte(stateKey))
	state := types.State{}
	k.cdc.MustUnmarshal(bz, &state)
	return state
}

func (k Keeper) SetState(ctx sdk.Context, state types.State) {
	store := ctx.KVStore(k.storeKey)
	bz := k.cdc.MustMarshal(&state)
	store.Set([]byte(stateKey), bz)
}

func (k Keeper) GetNextSequence(ctx sdk.Context) uint64 {
	state := k.GetState(ctx)
	state.LastSequence = state.GetLastSequence() + 1
	k.SetState(ctx, state)
	return state.LastSequence
}
