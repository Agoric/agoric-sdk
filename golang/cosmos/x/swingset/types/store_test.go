package types

import (
	"reflect"
	"testing"

	"github.com/cosmos/cosmos-sdk/store"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"

	dbm "github.com/tendermint/tm-db"
)

var (
	swingsetStoreKey = storetypes.NewKVStoreKey(StoreKey)
)

func makeTestStore() sdk.KVStore {
	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(swingsetStoreKey, sdk.StoreTypeIAVL, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		panic(err)
	}
	kvStore := ms.GetKVStore(swingsetStoreKey)

	return kvStore
}

func testSwingStore(t *testing.T, store SwingStore) {
	// Test that we can store and retrieve a value.
	store.Set([]byte("someKey"), []byte("someValue"))
	if got := string(store.Get([]byte("someKey"))); got != "someValue" {
		t.Errorf("got %q, want %q", got, "someValue")
	}

	// Test that we can update and retrieve an updated value.
	store.Set([]byte("someKey"), []byte("someNewValue"))
	if got := string(store.Get([]byte("someKey"))); got != "someNewValue" {
		t.Errorf("got %q, want %q", got, "someNewValue")
	}

	// Test that we can store and retrieve empty values
	store.Set([]byte("someEmptyKey"), []byte(""))
	if got := string(store.Get([]byte("someEmptyKey"))); got != "" {
		t.Errorf("got %q, want empty string", got)
	}

	// Test that we can store and delete values.
	store.Set([]byte("someOtherKey"), []byte("someOtherValue"))
	store.Delete([]byte("someOtherKey"))
	if store.Has([]byte("someOtherKey")) {
		t.Errorf("has value, expected not")
	}

	// Test that we can delete non existing keys (e.g. delete twice)
	store.Delete([]byte("someMissingKey"))

	// Check the iterated values
	expectedEntries := []*SwingStoreExportDataEntry{
		{Key: "someEmptyKey", Value: ""},
		{Key: "someKey", Value: "someNewValue"},
	}

	iter := store.Iterator(nil, nil)
	gotEntries := []*SwingStoreExportDataEntry{}
	for ; iter.Valid(); iter.Next() {
		entry := SwingStoreExportDataEntry{
			Key:   string(iter.Key()),
			Value: string(iter.Value()),
		}
		gotEntries = append(gotEntries, &entry)
	}
	iter.Close()

	if !reflect.DeepEqual(gotEntries, expectedEntries) {
		t.Errorf("got export %q, want %q", gotEntries, expectedEntries)
	}
}

func TestStoreRoot(t *testing.T) {
	testStore := makeTestStore()

	testSwingStore(t, NewSwingStore(testStore, nil))
}

func TestStorePrefix(t *testing.T) {
	testStore := makeTestStore()

	testSwingStore(t, NewSwingStore(testStore, []byte("testStore.")))
}
