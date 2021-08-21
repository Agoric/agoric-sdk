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
	cdc      codec.Codec

	accountKeeper authkeeper.AccountKeeper
	bankKeeper    bankkeeper.Keeper

	// CallToController dispatches a message to the controlling process
	CallToController func(ctx sdk.Context, str, simReturn string) (string, error)
}

// A prefix of bytes, since KVStores can't handle empty slices as keys.
var keyPrefix = []byte{':'}

// keyToString converts a byte slice path to a string key
func keyToString(key []byte) string {
	return string(key[len(keyPrefix):])
}

// stringToKey converts a string key to a byte slice path
func stringToKey(keyStr string) []byte {
	key := keyPrefix
	key = append(key, []byte(keyStr)...)
	return key
}

// NewKeeper creates a new IBC transfer Keeper instance
func NewKeeper(
	cdc codec.Codec, key sdk.StoreKey,
	accountKeeper authkeeper.AccountKeeper, bankKeeper bankkeeper.Keeper,
	callToController func(ctx sdk.Context, str, simReturn string) (string, error),
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

	storage := &types.Storage{Value: string(json)}
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
		keyStr := keyToString(iterator.Key())
		k.cdc.MustUnmarshalLengthPrefixed(iterator.Value(), &storage)
		exported[keyStr] = storage.Value
	}
	return exported
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) *types.Storage {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	dataKey := stringToKey(path)
	if !dataStore.Has(dataKey) {
		return &types.Storage{Value: ""}
	}
	bz := dataStore.Get(dataKey)
	var storage types.Storage
	k.cdc.MustUnmarshalLengthPrefixed(bz, &storage)
	return &storage
}

// GetKeys gets all storage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) *types.Keys {
	store := ctx.KVStore(k.storeKey)
	keysStore := prefix.NewStore(store, types.KeysPrefix)
	key := stringToKey(path)
	if !keysStore.Has(key) {
		return types.NewKeys()
	}
	bz := keysStore.Get(key)
	var keys types.Keys
	k.cdc.MustUnmarshalLengthPrefixed(bz, &keys)
	return &keys
}

// SetStorage sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path string, storage *types.Storage) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	keysStore := prefix.NewStore(store, types.KeysPrefix)

	// Update the value.
	pathKey := stringToKey(path)
	if storage.Value == "" {
		dataStore.Delete(pathKey)
	} else {
		dataStore.Set(pathKey, k.cdc.MustMarshalLengthPrefixed(storage))
	}

	// Update the parent keys.
	pathComponents := strings.Split(path, ".")
	for i := len(pathComponents) - 1; i >= 0; i-- {
		ancestor := strings.Join(pathComponents[0:i], ".")
		lastKeyStr := pathComponents[i]

		// Get a map corresponding to the parent's keys.
		keyNode := k.GetKeys(ctx, ancestor)
		keyList := keyNode.Keys
		keyMap := make(map[string]bool, len(keyList)+1)
		for _, keyStr := range keyList {
			keyMap[keyStr] = true
		}

		// Decide if we need to add or remove the key.
		if storage.Value == "" {
			if _, ok := keyMap[lastKeyStr]; !ok {
				// If the key is already gone, we don't need to remove from the key lists.
				return
			}
			// Delete the key.
			delete(keyMap, lastKeyStr)
		} else {
			if _, ok := keyMap[lastKeyStr]; ok {
				// If the key already exists, we don't need to add to the key lists.
				return
			}
			// Add the key.
			keyMap[lastKeyStr] = true
		}

		keyList = make([]string, 0, len(keyMap))
		for keyStr := range keyMap {
			keyList = append(keyList, keyStr)
		}

		// Update the list of keys
		ancestorKey := stringToKey(ancestor)
		if len(keyList) == 0 {
			// No keys left, delete the parent.
			keysStore.Delete(ancestorKey)
		} else {
			// Update the key node, ordering deterministically.
			sort.Strings(keyList)
			keyNode.Keys = keyList
			keysStore.Set(ancestorKey, k.cdc.MustMarshalLengthPrefixed(keyNode))
		}
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
