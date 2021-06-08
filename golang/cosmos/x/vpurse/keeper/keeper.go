package keeper

import (
	"github.com/cosmos/cosmos-sdk/codec"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vpurse/types"
)

const genesis string = "genesis"

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      codec.Codec

	bankKeeper       types.BankKeeper
	feeCollectorName string

	// CallToController dispatches a message to the controlling process
	CallToController func(ctx sdk.Context, str string) (string, error)
}

// NewKeeper creates a new vpurse Keeper instance
func NewKeeper(
	cdc codec.Codec, key sdk.StoreKey,
	bankKeeper types.BankKeeper,
	feeCollectorName string,
	callToController func(ctx sdk.Context, str string) (string, error),
) Keeper {

	return Keeper{
		storeKey:         key,
		cdc:              cdc,
		bankKeeper:       bankKeeper,
		feeCollectorName: feeCollectorName,
		CallToController: callToController,
	}
}

func (k Keeper) GetGenesis(ctx sdk.Context) types.GenesisState {
	store := ctx.KVStore(k.storeKey)
	bz := store.Get([]byte(genesis))
	var gs types.GenesisState
	k.cdc.MustUnmarshalLengthPrefixed(bz, &gs)
	return gs
}

func (k Keeper) SetGenesis(ctx sdk.Context, data types.GenesisState) {
	store := ctx.KVStore(k.storeKey)
	store.Set([]byte(genesis), k.cdc.MustMarshalLengthPrefixed(&data))
}

func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

func (k Keeper) GetAllBalances(ctx sdk.Context, addr sdk.AccAddress) sdk.Coins {
	return k.bankKeeper.GetAllBalances(ctx, addr)
}

func (k Keeper) SendCoinsToFeeCollector(ctx sdk.Context, amt sdk.Coins) error {
	if err := k.bankKeeper.MintCoins(ctx, types.ModuleName, amt); err != nil {
		return err
	}
	return k.bankKeeper.SendCoinsFromModuleToModule(ctx, types.ModuleName, k.feeCollectorName, amt)
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
