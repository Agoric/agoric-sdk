package keeper

import (
	"sort"
	"strings"

	"github.com/Agoric/cosmic-swingset/x/swingset/internal/types"
	"github.com/cosmos/cosmos-sdk/codec"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Keeper maintains the link to data storage and exposes getter/setter methods for the various parts of the state machine
type Keeper struct {
	CoinKeeper types.BankKeeper

	storeKey sdk.StoreKey // Unexposed key to access store from sdk.Context

	cdc *codec.Codec // The wire codec for binary encoding/decoding.

	sendToController func(needReply bool, str string) (string, error)
}

// NewKeeper creates new instances of the swingset Keeper
func NewKeeper(cdc *codec.Codec, storeKey sdk.StoreKey, coinKeeper types.BankKeeper,
	sendToController func(needReply bool, str string) (string, error)) Keeper {
	return Keeper{
		CoinKeeper:       coinKeeper,
		storeKey:         storeKey,
		cdc:              cdc,
		sendToController: sendToController,
	}
}

// CallToController dispatches a message to the controlling process
func (k Keeper) CallToController(str string) (string, error) {
	return k.sendToController(true, str)
}

// GetStorage gets generic storage
func (k Keeper) GetStorage(ctx sdk.Context, path string) types.Storage {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	if !dataStore.Has([]byte(path)) {
		return types.Storage{""}
	}
	bz := dataStore.Get([]byte(path))
	var storage types.Storage
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &storage)
	return storage
}

func (k Keeper) GetKeys(ctx sdk.Context, path string) types.Keys {
	store := ctx.KVStore(k.storeKey)
	keysStore := prefix.NewStore(store, types.KeysPrefix)
	if !keysStore.Has([]byte(path)) {
		return types.NewKeys()
	}
	bz := keysStore.Get([]byte(path))
	var keys types.Keys
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &keys)
	return keys
}

// Sets the entire generic storage for a path
func (k Keeper) SetStorage(ctx sdk.Context, path string, storage types.Storage) {
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

// Gets the entire mailbox struct for a peer
func (k Keeper) GetMailbox(ctx sdk.Context, peer string) types.Storage {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	path := "mailbox." + peer
	if !dataStore.Has([]byte(path)) {
		return types.NewMailbox()
	}
	bz := dataStore.Get([]byte(path))
	var mailbox types.Storage
	k.cdc.MustUnmarshalBinaryLengthPrefixed(bz, &mailbox)
	return mailbox
}

// Sets the entire mailbox struct for a peer
func (k Keeper) SetMailbox(ctx sdk.Context, peer string, mailbox types.Storage) {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataPrefix)
	path := "mailbox." + peer
	dataStore.Set([]byte(path), k.cdc.MustMarshalBinaryLengthPrefixed(mailbox))
}

// Get an iterator over all peers in which the keys are the peers and the values are the mailbox
func (k Keeper) GetPeersIterator(ctx sdk.Context) sdk.Iterator {
	store := ctx.KVStore(k.storeKey)
	return sdk.KVStorePrefixIterator(store, nil)
}
