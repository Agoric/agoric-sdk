package keeper

import (
	"sort"
	"strings"

	"github.com/cosmos/cosmos-sdk/codec"

	sdk "github.com/cosmos/cosmos-sdk/types"
	"github.com/cosmos/cosmos-sdk/x/bank"
	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	CoinKeeper bank.Keeper

	storeKey sdk.StoreKey // Unexposed key to access store from sdk.Context

	cdc *codec.Codec // The wire codec for binary encoding/decoding.
}

// NewKeeper creates new instances of the swingset Keeper
func NewKeeper(coinKeeper bank.Keeper, storeKey sdk.StoreKey, cdc *codec.Codec) Keeper {
	return Keeper{
		CoinKeeper: coinKeeper,
		storeKey:   storeKey,
		cdc:        cdc,
	}
}

// Gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) types.Storage {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	fullPath := "data:" + path
	if !store.Has([]byte(fullPath)) {
		return types.Storage{""}
	}
	bz := store.Get([]byte(fullPath))
	var storage types.Storage
	k.cdc.MustUnmarshalBinaryBare(bz, &storage)
	return storage
}

func (k Keeper) GetKeys(ctx sdk.Context, path string) types.Keys {
	store := ctx.KVStore(k.storeKey)
	fullPath := "keys:" + path
	if !store.Has([]byte(fullPath)) {
		return types.NewKeys()
	}
	bz := store.Get([]byte(fullPath))
	var keys types.Keys
	k.cdc.MustUnmarshalBinaryBare(bz, &keys)
	return keys
}

// Sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path string, storage types.Storage) {
	store := ctx.KVStore(k.storeKey)

	fullPath := "data:" + path
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
		store.Delete([]byte(fullPath))
	} else {
		store.Set([]byte(fullPath), k.cdc.MustMarshalBinaryBare(storage))
	}

	// Update the keys.
	keysPath := "keys:" + oneUp
	if len(keyList) == 0 {
		store.Delete([]byte(keysPath))
	} else {
		// Update the key node.
		sort.Strings(keyList)
		keyNode.Keys = keyList
		store.Set([]byte(keysPath), k.cdc.MustMarshalBinaryBare(keyNode))
	}
}

// Gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) types.Storage {
	store := ctx.KVStore(k.storeKey)
	path := "data:mailbox." + peer
	if !store.Has([]byte(path)) {
		return types.NewMailbox()
	}
	bz := store.Get([]byte(path))
	var mailbox types.Storage
	k.cdc.MustUnmarshalBinaryBare(bz, &mailbox)
	return mailbox
}

// Sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox types.Storage) {
	store := ctx.KVStore(k.storeKey)
	path := "data:mailbox." + peer
	store.Set([]byte(path), k.cdc.MustMarshalBinaryBare(mailbox))
}

// Get an iterator over all peers in which the keys are the peers and the values are the mailbox
func (k Keeper) GetPeersIterator(ctx sdk.Context) sdk.Iterator {
	store := ctx.KVStore(k.storeKey)
	return sdk.KVStorePrefixIterator(store, nil)
}
