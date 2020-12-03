package keeper

import (
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/tendermint/tendermint/libs/log"

	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
	authkeeper "github.com/cosmos/cosmos-sdk/x/auth/keeper"
	bankkeeper "github.com/cosmos/cosmos-sdk/x/bank/keeper"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
	cdc      codec.Marshaler

	accountKeeper authkeeper.AccountKeeper
	bankKeeper    bankkeeper.Keeper

	// CallToController dispatches a message to the controlling process
	CallToController func(ctx sdk.Context, str string) (string, error)
}

// NewKeeper creates a new IBC transfer Keeper instance
func NewKeeper(
	cdc codec.Marshaler, key sdk.StoreKey,
	accountKeeper authkeeper.AccountKeeper, bankKeeper bankkeeper.Keeper,
	callToController func(ctx sdk.Context, str string) (string, error),
) Keeper {

	return Keeper{
		storeKey:         key,
		cdc:              cdc,
		accountKeeper:    accountKeeper,
		bankKeeper:       bankKeeper,
		CallToController: callToController,
	}
}

func (k Keeper) GetBalance(ctx sdk.Context, addr sdk.AccAddress, denom string) sdk.Coin {
	return k.bankKeeper.GetBalance(ctx, addr, denom)
}

// GetEgress gets the entire egress struct for a peer
func (k Keeper) GetEgress(ctx sdk.Context, addr sdk.AccAddress) types.Egress {
	path := "egress." + addr.String()
	storage := k.GetStorage(ctx, path)
	if storage.Value == "" {
		return types.Egress{}
	}

	var egress types.Egress
	err := json.Unmarshal([]byte(storage.Value), &egress)
	if err != nil {
		panic(err)
	}

	return egress
}

// SetEgress sets the egress struct for a peer, and ensures its account exists
func (k Keeper) SetEgress(ctx sdk.Context, egress *types.Egress) error {
	path := "egress." + egress.Peer.String()

	json, err := json.Marshal(egress)
	if err != nil {
		return err
	}

	storage := &types.Storage{string(json)}
	k.SetStorage(ctx, path, storage)

	// Now make sure the corresponding account has been initialised.
	if acc := k.accountKeeper.GetAccount(ctx, egress.Peer); acc != nil {
		// Account already exists.
		return nil
	}

	// Create an account object with the specified address.
	acc := k.accountKeeper.NewAccountWithAddress(ctx, egress.Peer)

	// Store it in the keeper (panics on error).
	k.accountKeeper.SetAccount(ctx, acc)

	// Tell we were successful.
	return nil
}

// ExportStorage fetches all storage
func (k Keeper) ExportStorage(ctx sdk.Context) map[string]string {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)

	iterator := sdk.KVStorePrefixIterator(dataStore, nil)

	exported := make(map[string]string)
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		var storage types.Storage
		k.cdc.MustUnmarshalBinaryLengthPrefixed(iterator.Value(), &storage)
		exported[string(iterator.Key())] = storage.Value
	}
	return exported
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) *types.Storage {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	if !dataStore.Has([]byte(path)) {
		return &types.Storage{""}
	}
	bz := dataStore.Get([]byte(path))
	var storage types.Storage
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &storage)
	return &storage
}

// GetKeys gets all storage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) *types.Keys {
	store := ctx.KVStore(k.storeKey)
	keysStore := prefix.NewStore(store, types.KeysPrefix)
	if !keysStore.Has([]byte(path)) {
		return types.NewKeys()
	}
	bz := keysStore.Get([]byte(path))
	var keys types.Keys
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &keys)
	return &keys
}

// SetStorage sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path string, storage *types.Storage) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	keysStore := prefix.NewStore(store, types.KeysPrefix)

	fullPathArray := strings.Split(path, ".")
	oneUp := strings.Join(fullPathArray[0:len(fullPathArray)-1], ".")
	lastKey := fullPathArray[len(fullPathArray)-1]

	// Get a map corresponding to the keys for the parent key.
	keyNode := k.GetKeys(ctx, oneUp)
	keyList := keyNode.Keys
	keyMap := make(map[string]bool, len(keyList)+1)
	for _, key := range keyList {
		keyMap[key] = true
	}

	if storage.Value == "" {
		delete(keyMap, lastKey)
	} else {
		keyMap[lastKey] = true
	}

	// Update the list of keys
	keyList = make([]string, 0, len(keyMap))
	for key := range keyMap {
		keyList = append(keyList, key)
	}

	// Update the value.
	if storage.Value == "" {
		dataStore.Delete([]byte(path))
	} else {
		dataStore.Set([]byte(path), k.cdc.MustMarshalBinaryLengthPrefixed(storage))
	}

	// Update the keys.
	if len(keyList) == 0 {
		keysStore.Delete([]byte(oneUp))
	} else {
		// Update the key node.
		sort.Strings(keyList)
		keyNode.Keys = keyList
		keysStore.Set([]byte(oneUp), k.cdc.MustMarshalBinaryLengthPrefixed(keyNode))
	}
}

// Logger returns a module-specific logger.
func (k Keeper) Logger(ctx sdk.Context) log.Logger {
	return ctx.Logger().With("module", fmt.Sprintf("x/%s", types.ModuleName))
}

// GetMailbox gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) *types.Storage {
	path := "mailbox." + peer
	return k.GetStorage(ctx, path)
}

// SetMailbox sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox *types.Storage) {
	path := "mailbox." + peer
	k.SetStorage(ctx, path, mailbox)
}

// GetPeersIterator works over all peers in which the keys are the peers and the values are the mailbox
func (k Keeper) GetPeersIterator(ctx sdk.Context) sdk.Iterator {
	store := ctx.KVStore(k.storeKey)
	return sdk.KVStorePrefixIterator(store, nil)
}
