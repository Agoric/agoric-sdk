package keeper

import (
	"bytes"
	"strings"

	sdk "github.com/cosmos/cosmos-sdk/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
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

	iterator := sdk.KVStorePrefixIterator(store, nil)

	exported := []*types.DataEntry{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		path := types.EncodedKeyToPath(iterator.Key())
		value := string(bytes.TrimPrefix(iterator.Value(), types.EncodedDataPrefix))
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

// GetData gets generic storage.  The default value is an empty string.
func (k Keeper) GetData(ctx sdk.Context, path string) string {
	//fmt.Printf("GetData(%s)\n", path);
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)
	bz := bytes.TrimPrefix(store.Get(encodedKey), types.EncodedDataPrefix)
	value := string(bz)
	return value
}

func (k Keeper) getKeyIterator(ctx sdk.Context, path string) db.Iterator {
	store := ctx.KVStore(k.storeKey)
	keyPrefix := types.PathToChildrenPrefix(path)

	return sdk.KVStorePrefixIterator(store, keyPrefix)
}

// GetChildren gets all vstorage child children at a given path
func (k Keeper) GetChildren(ctx sdk.Context, path string) *types.Children {
	iterator := k.getKeyIterator(ctx, path)

	var children types.Children
	children.Children = []string{}
	defer iterator.Close()
	for ; iterator.Valid(); iterator.Next() {
		parts := strings.Split(types.EncodedKeyToPath(iterator.Key()), types.PathSeparator)
		childrentr := parts[len(parts)-1]
		children.Children = append(children.Children, childrentr)
	}
	return &children
}

// HasStorage tells if a given path has data.  Some storage nodes have no data
// (just an empty string) and exist only to provide linkage to subnodes with
// data.
func (k Keeper) HasStorage(ctx sdk.Context, path string) bool {
	return k.GetData(ctx, path) != ""
}

// HasEntry tells if a given path has either subnodes or data.
func (k Keeper) HasEntry(ctx sdk.Context, path string) bool {
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)

	// Check if we have a path entry.
	return store.Has(encodedKey)
}

// HasChildren tells if a given path has child children.
func (k Keeper) HasChildren(ctx sdk.Context, path string) bool {
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

func (k Keeper) SetStorageAndNotify(ctx sdk.Context, path, value string) {
	k.LegacySetStorageAndNotify(ctx, path, value)

	// Emit the new state change event.
	ctx.EventManager().EmitEvent(
		agoric.NewStateChangeEvent(
			k.GetStoreName(),
			k.PathToEncodedKey(path),
			[]byte(value),
		),
	)
}

func componentsToPath(components []string) string {
	return strings.Join(components, types.PathSeparator)
}

// SetStorage sets the data value for a path.
//
// Maintains the invariant: path entries exist if and only if self or some
// descendant has non-empty storage
func (k Keeper) SetStorage(ctx sdk.Context, path, value string) {
	store := ctx.KVStore(k.storeKey)
	encodedKey := types.PathToEncodedKey(path)

	if value == "" && !k.HasChildren(ctx, path) {
		// We have no children, can delete.
		store.Delete(encodedKey)
	} else {
		// Update the value.
		bz := bytes.Join([][]byte{types.EncodedDataPrefix, []byte(value)}, []byte{})
		store.Set(encodedKey, bz)
	}

	// Update our other parent children.
	pathComponents := strings.Split(path, types.PathSeparator)
	if value == "" {
		// delete placeholder ancestors if they're no longer needed
		for i := len(pathComponents) - 1; i >= 0; i-- {
			ancestor := componentsToPath(pathComponents[0:i])
			if k.HasStorage(ctx, ancestor) || k.HasChildren(ctx, ancestor) {
				// this and further ancestors are needed, skip out
				break
			}
			store.Delete(types.PathToEncodedKey(ancestor))
		}
	} else {
		// add placeholders as needed
		for i := len(pathComponents) - 1; i >= 0; i-- {
			ancestor := componentsToPath(pathComponents[0:i])
			if k.HasEntry(ctx, ancestor) {
				// The ancestor exists, implying all further ancestors exist, so we can break.
				break
			}
			store.Set(types.PathToEncodedKey(ancestor), types.EncodedDataPrefix)
		}
	}
}
