package keeper

import (
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	"github.com/cosmos/cosmos-sdk/store/prefix"
	db "github.com/tendermint/tm-db"
)

// Keeper maintains the link to data storage and exposes getter/setter methods
// for the various parts of the state machine
type Keeper struct {
	storeKey sdk.StoreKey
}

func NewKeeper(storeKey sdk.StoreKey) Keeper {
	return Keeper{storeKey}
}

// ExportStorage fetches all storage
func (k Keeper) ExportStorage(ctx sdk.Context) []*types.DataEntry {
	store := ctx.KVStore(k.storeKey)
	encodedStore := prefix.NewStore(store, types.EncodedKeyPrefix)

	iterator := sdk.KVStorePrefixIterator(encodedStore, nil)

	exported := []*types.DataEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		path := types.KeyToPath(iterator.Key())
		value := k.GetData(ctx, path)
		if len(value) == 0 {
			continue
		}
		entry := types.DataEntry{Path: path, Value: value}
		exported = append(exported, &entry)
	}
	return exported
}

func (k Keeper) ImportStorage(ctx sdk.Context, entries []*types.DataEntry) {
	for _, entry := range entries {
		// This set does the bookkeeping for us in case the entries aren't a
		// complete tree.
		k.SetStorage(ctx, entry.Path, entry.Value)
	}
}

// GetData gets generic storage
func (k Keeper) GetData(ctx sdk.Context, path string) string {
	//fmt.Printf("GetStorage(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)
	dataKey := types.PathToDataKey(path)
	if !dataStore.Has(dataKey) {
		return ""
	}
	bz := dataStore.Get(dataKey)
	value := string(bz)
	return value
}

func (k Keeper) getKeyIterator(ctx sdk.Context, path string) db.Iterator {
	store := ctx.KVStore(k.storeKey)
	pathStore := prefix.NewStore(store, types.EncodedKeyPrefix)
	keyPrefix := types.PathToChildrenPrefix(path)

	return sdk.KVStorePrefixIterator(pathStore, keyPrefix)
}

// GetKeys gets all vstorage child keys at a given path
func (k Keeper) GetKeys(ctx sdk.Context, path string) *types.Keys {
	iterator := k.getKeyIterator(ctx, path)

	var keys types.Keys
	keys.Keys = []string{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		parts := strings.Split(types.KeyToPath(iterator.Key()), types.PathSeparator)
		keyStr := parts[len(parts)-1]
		keys.Keys = append(keys.Keys, keyStr)
	}
	return &keys
}

// HasStorage tells if a given path has data.
func (k Keeper) HasStorage(ctx sdk.Context, path string) bool {
	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)
	dataKey := types.PathToDataKey(path)

	// Check if we have data.
	return dataStore.Has(dataKey)
}

func (k Keeper) hasPath(ctx sdk.Context, path string) bool {
	store := ctx.KVStore(k.storeKey)
	encodedStore := prefix.NewStore(store, types.EncodedKeyPrefix)
	encodedKey := types.PathToEncodedKey(path)

	// Check if we have a path entry.
	return encodedStore.Has(encodedKey)
}

// HasKeys tells if a given path has child keys.
func (k Keeper) HasKeys(ctx sdk.Context, path string) bool {
	// Check if we have children.
	iterator := k.getKeyIterator(ctx, path)
	defer iterator.Close()
	return iterator.Valid()
}

func (k Keeper) LegacySetStorageAndNotify(ctx sdk.Context, path, value string) {
	k.SetStorage(ctx, path, value)

	// Emit the legacy change event.
	ctx.EventManager().EmitEvent(
		types.NewLegacyStorageEvent(path, value),
	)
}

// SetStorage sets the string value for a path.  Returns true if changed.
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) bool {
	if k.GetData(ctx, path) == value {
		// No change.
		return false
	}

	store := ctx.KVStore(k.storeKey)
	dataStore := prefix.NewStore(store, types.DataKeyPrefix)

	// Update the value.
	dataKey := types.PathToDataKey(path)
	if value == "" {
		dataStore.Delete(dataKey)
	} else {
		dataStore.Set(dataKey, []byte(value))
	}
	k.updatePathAncestry(ctx, path, value == "")
	return true
}

// Maintains the invariant: path entries exist if and only if self or some
// descendant has non-empty storage
func (k Keeper) updatePathAncestry(ctx sdk.Context, path string, deleting bool) {
	store := ctx.KVStore(k.storeKey)
	encodedStore := prefix.NewStore(store, types.EncodedKeyPrefix)

	// Update our and other parent keys.
	pathComponents := strings.Split(path, types.PathSeparator)
	for i := len(pathComponents); i >= 0; i-- {
		ancestor := strings.Join(pathComponents[0:i], types.PathSeparator)

		// Decide if we need to add or remove the ancestor.
		if deleting {
			if k.HasStorage(ctx, ancestor) || k.HasKeys(ctx, ancestor) {
				// If the key is needed, skip out.
				return
			}
			// Delete the key.
			encodedStore.Delete(types.PathToEncodedKey(ancestor))
		} else if i < len(pathComponents) && k.hasPath(ctx, ancestor) {
			// The key is present, so we can skip out.
			return
		} else {
			// Add the key as an placeholder value.
			encodedStore.Set(types.PathToEncodedKey(ancestor), types.DataPrefix)
		}
	}
}
