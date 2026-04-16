package keeper

import (
	"context"

	"cosmossdk.io/core/address"
	storetypes "cosmossdk.io/core/store"
	sdkerrors "cosmossdk.io/errors"
	"cosmossdk.io/store/prefix"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	sdktypeserrors "github.com/cosmos/cosmos-sdk/types/errors"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	paramtypes "github.com/cosmos/cosmos-sdk/x/params/types"

	vm "github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

const stateKey string = "state"

// addressToUpdatePrefix is a map of addresses to the set of denoms that need a
// balance update. The denoms are stored as Coins, but we only use the denoms,
// not the amounts.  This is in a transient store, so it is not persisted across
// blocks.
const addressToUpdatePrefix string = "addressToUpdate"

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeService  storetypes.KVStoreService
	tstoreService storetypes.TransientStoreService
	cdc           codec.Codec
	paramSpace    paramtypes.Subspace

	accountKeeper         types.AccountKeeper
	bankKeeper            types.BankKeeper
	rewardDistributorName string
	PushAction            vm.ActionPusher
	AddressToUpdate       map[string]sdk.Coins // address string -> Coins
}

// NewKeeper creates a new vbank Keeper instance
func NewKeeper(
	cdc codec.Codec,
	storeService storetypes.KVStoreService,
	tstoreService storetypes.TransientStoreService,
	paramSpace paramtypes.Subspace,
	accountKeeper types.AccountKeeper, bankKeeper types.BankKeeper,
	rewardDistributorName string,
	pushAction vm.ActionPusher,
) Keeper {

	// set KeyTable if it has not already been set
	if !paramSpace.HasKeyTable() {
		paramSpace = paramSpace.WithKeyTable(types.ParamKeyTable())
	}

	k := Keeper{
		storeService:          storeService,
		tstoreService:         tstoreService,
		cdc:                   cdc,
		paramSpace:            paramSpace,
		accountKeeper:         accountKeeper,
		bankKeeper:            bankKeeper,
		rewardDistributorName: rewardDistributorName,
		PushAction:            pushAction,
	}

	k.bankKeeper.AppendSendRestriction(k.monitorSend)
	return k
}

func (k Keeper) monitorSend(
	ctx context.Context, fromAddr, toAddr sdk.AccAddress, amt sdk.Coins,
) (sdk.AccAddress, error) {
	sdkCtx := sdk.UnwrapSDKContext(ctx)
	adStore := k.OpenAddressToUpdateStore(sdkCtx)
	if err := k.ensureAddressUpdate(adStore, fromAddr, amt); err != nil {
		return nil, sdkerrors.Wrap(sdktypeserrors.ErrInvalidRequest, err.Error())
	}
	if err := k.ensureAddressUpdate(adStore, toAddr, amt); err != nil {
		return nil, sdkerrors.Wrap(sdktypeserrors.ErrInvalidRequest, err.Error())
	}
	return toAddr, nil
}

// records that we want to emit a balance update for the address
// for the given denoms. We use the Coins only to track the set of
// denoms, not for the amounts.
func (k Keeper) ensureAddressUpdate(adStore prefix.Store, address sdk.AccAddress, denoms sdk.Coins) error {
	if denoms.IsZero() {
		return nil
	}

	var newDenoms sdk.Coins

	// Get the existing denoms for the address, or create a new set if it doesn't exist
	if adStore.Has(address) {
		// If we have existing denoms, parse them
		bz := adStore.Get(address)
		currentDenoms, err := sdk.ParseCoinsNormalized(string(bz))
		if err != nil {
			return sdkerrors.Wrap(sdktypeserrors.ErrInvalidRequest, err.Error())
		}
		newDenoms = currentDenoms
	}

	newDenoms = newDenoms.Add(denoms...)

	// ensure the denoms are sorted before we store them
	str := newDenoms.Sort().String()
	adStore.Set(address, []byte(str))
	return nil
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

func (k Keeper) AddressCodec() address.Codec {
	return k.accountKeeper.AddressCodec()
}

func (k Keeper) IsAllowedMonitoringAccount(ctx sdk.Context, addr string) bool {
	params := k.GetParams(ctx)
	return params.IsAllowedMonitoringAccount(addr)
}

func (k Keeper) GetParams(ctx sdk.Context) (params types.Params) {
	k.paramSpace.GetParamSetIfExists(ctx, &params)
	return params
}

func (k Keeper) SetParams(ctx sdk.Context, params types.Params) {
	k.paramSpace.SetParamSet(ctx, &params)
}

func (k Keeper) GetState(ctx sdk.Context) (types.State, error) {
	store := k.storeService.OpenKVStore(ctx)
	var state types.State
	bz, err := store.Get([]byte(stateKey))
	if err != nil {
		return state, err
	}
	return state, k.cdc.Unmarshal(bz, &state)
}

func (k Keeper) SetState(ctx sdk.Context, state types.State) error {
	store := k.storeService.OpenKVStore(ctx)
	bz, err := k.cdc.Marshal(&state)
	if err != nil {
		return err
	}
	return store.Set([]byte(stateKey), bz)
}

func (k Keeper) GetNextSequence(ctx sdk.Context) (uint64, error) {
	state, err := k.GetState(ctx)
	if err != nil {
		return 0, err
	}
	state.LastSequence = state.GetLastSequence() + 1
	return state.LastSequence, k.SetState(ctx, state)
}

func (k Keeper) OpenAddressToUpdateStore(ctx sdk.Context) prefix.Store {
	store := k.tstoreService.OpenTransientStore(ctx)
	if store == nil {
		panic("transient store is nil")
	}
	kvstore := runtime.KVStoreAdapter(store)
	return prefix.NewStore(kvstore, []byte(addressToUpdatePrefix))
}
