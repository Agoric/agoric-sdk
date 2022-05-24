package keeper

import (
	"bytes"
	"reflect"
	"testing"

	"github.com/Agoric/agoric-sdk/golang/cosmos/app/params"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"

	"github.com/cosmos/cosmos-sdk/store"
	storetypes "github.com/cosmos/cosmos-sdk/store/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
	paramskeeper "github.com/cosmos/cosmos-sdk/x/params/keeper"
	paramstypes "github.com/cosmos/cosmos-sdk/x/params/types"

	"github.com/tendermint/tendermint/libs/log"
	tmproto "github.com/tendermint/tendermint/proto/tendermint/types"
	dbm "github.com/tendermint/tm-db"
)

var (
	paramsStoreKey   = storetypes.NewKVStoreKey(paramstypes.StoreKey)
	paramsTKey       = storetypes.NewTransientStoreKey(paramstypes.TStoreKey)
	swingsetStoreKey = storetypes.NewKVStoreKey(types.StoreKey)
)

func Test_Key_Encoding(t *testing.T) {
	tests := []struct {
		name   string
		keyStr string
		key    []byte
	}{
		{
			name:   "empty key is prefixed",
			keyStr: "",
			key:    []byte("0\x00"),
		},
		{
			name:   "some key string",
			keyStr: "some",
			key:    []byte("1\x00some"),
		},
		{
			name:   "dot-separated",
			keyStr: "some.child.grandchild",
			key:    []byte("3\x00some\x00child\x00grandchild"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if key := pathToKey(tt.keyStr); !bytes.Equal(key, tt.key) {
				t.Errorf("pathToKey(%q) = %v, want %v", tt.keyStr, key, tt.key)
			}
			if keyStr := keyToPath(tt.key); keyStr != tt.keyStr {
				t.Errorf("keyToString(%v) = %q, want %q", tt.key, keyStr, tt.keyStr)
			}
		})
	}
}

type testKit struct {
	ctx            sdk.Context
	swingsetKeeper Keeper
}

func makeTestKit() testKit {
	encodingConfig := params.MakeEncodingConfig()
	types.RegisterInterfaces(encodingConfig.InterfaceRegistry)
	cdc := encodingConfig.Marshaler

	pk := paramskeeper.NewKeeper(cdc, encodingConfig.Amino, paramsStoreKey, paramsTKey)
	swingsetSpace := pk.Subspace(types.ModuleName)

	// TODO: Flesh out with more than nil if necessary.
	keeper := NewKeeper(cdc, swingsetStoreKey, swingsetSpace, nil, nil, "nil", nil)

	db := dbm.NewMemDB()
	ms := store.NewCommitMultiStore(db)
	ms.MountStoreWithDB(swingsetStoreKey, sdk.StoreTypeIAVL, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		panic(err)
	}
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	return testKit{ctx, keeper}
}

func keysEqual(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func TestStorage(t *testing.T) {
	testKit := makeTestKit()
	ctx, keeper := testKit.ctx, testKit.swingsetKeeper

	// Test that we can store and retrieve a value.
	keeper.SetStorage(ctx, "inited", "initValue")
	if got := keeper.GetStorage(ctx, "inited"); got != "initValue" {
		t.Errorf("got %q, want %q", got, "initValue")
	}

	// Test that unknown keys return empty string.
	if got := keeper.GetStorage(ctx, "unknown"); got != "" {
		t.Errorf("got %q, want empty string", got)
	}

	// Check that our keys are updated as expected.
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"inited"}) {
		t.Errorf("got %q keys, want [inited]", got.Keys)
	}

	keeper.SetStorage(ctx, "key1", "value1")
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"inited", "key1"}) {
		t.Errorf("got %q keys, want [inited,key1]", got.Keys)
	}

	// Check alphabetical.
	keeper.SetStorage(ctx, "alpha2", "value2")
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"alpha2", "inited", "key1"}) {
		t.Errorf("got %q keys, want [alpha2,inited,key1]", got.Keys)
	}

	keeper.SetStorage(ctx, "beta3", "value3")
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"alpha2", "beta3", "inited", "key1"}) {
		t.Errorf("got %q keys, want [alpha2,beta3,inited,key1]", got.Keys)
	}

	if got := keeper.GetKeys(ctx, "nonexistent"); !keysEqual(got.Keys, []string{}) {
		t.Errorf("got %q keys, want []", got.Keys)
	}

	// Check adding children.
	keeper.SetStorage(ctx, "key1.child1", "value1child")
	if got := keeper.GetStorage(ctx, "key1.child1"); got != "value1child" {
		t.Errorf("got %q, want %q", got, "value1child")
	}

	if got := keeper.GetKeys(ctx, "key1"); !keysEqual(got.Keys, []string{"child1"}) {
		t.Errorf("got %q keys, want [child1]", got.Keys)
	}

	// Add a grandchild.
	keeper.SetStorage(ctx, "key1.child1.grandchild1", "value1grandchild")
	if got := keeper.GetStorage(ctx, "key1.child1.grandchild1"); got != "value1grandchild" {
		t.Errorf("got %q, want %q", got, "value1grandchild")
	}

	if got := keeper.GetKeys(ctx, "key1.child1"); !keysEqual(got.Keys, []string{"grandchild1"}) {
		t.Errorf("got %q keys, want [grandchild1]", got.Keys)
	}

	// Delete the child's contents.
	keeper.SetStorage(ctx, "key1.child1", "")
	if got := keeper.GetKeys(ctx, "key1"); !keysEqual(got.Keys, []string{"child1"}) {
		t.Errorf("got %q keys, want [child1]", got.Keys)
	}

	if got := keeper.GetKeys(ctx, "key1.child1"); !keysEqual(got.Keys, []string{"grandchild1"}) {
		t.Errorf("got %q keys, want [grandchild1]", got.Keys)
	}

	// Delete the grandchild's contents.
	keeper.SetStorage(ctx, "key1.child1.grandchild1", "")
	if got := keeper.GetKeys(ctx, "key1.child1"); !keysEqual(got.Keys, []string{}) {
		t.Errorf("got %q keys, want []", got.Keys)
	}
	// Removing that node rolls up into the parent.
	if got := keeper.GetKeys(ctx, "key1"); !keysEqual(got.Keys, []string{}) {
		t.Errorf("got %q keys, want []", got.Keys)
	}

	// See about deleting the parent.
	keeper.SetStorage(ctx, "key1", "")
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"alpha2", "beta3", "inited"}) {
		t.Errorf("got %q keys, want [alpha2,beta3,inited]", got.Keys)
	}

	// Do a deep set.
	keeper.SetStorage(ctx, "key2.child2.grandchild2", "value2grandchild")
	if got := keeper.GetKeys(ctx, ""); !keysEqual(got.Keys, []string{"alpha2", "beta3", "inited", "key2"}) {
		t.Errorf("got %q keys, want [alpha2,beta3,inited,key2]", got.Keys)
	}
	if got := keeper.GetKeys(ctx, "key2.child2"); !keysEqual(got.Keys, []string{"grandchild2"}) {
		t.Errorf("got %q keys, want [grandchild2]", got.Keys)
	}
	if got := keeper.GetKeys(ctx, "key2"); !keysEqual(got.Keys, []string{"child2"}) {
		t.Errorf("got %q keys, want [child2]", got.Keys)
	}

	// Do another deep set.
	keeper.SetStorage(ctx, "key2.child2.grandchild2a", "value2grandchilda")
	if got := keeper.GetKeys(ctx, "key2.child2"); !keysEqual(got.Keys, []string{"grandchild2", "grandchild2a"}) {
		t.Errorf("got %q keys, want [grandchild2,grandchild2a]", got.Keys)
	}

	// Check the export.
	expectedExport := []*types.StorageEntry{
		{Key: "alpha2", Value: "value2"},
		{Key: "beta3", Value: "value3"},
		{Key: "inited", Value: "initValue"},
		{Key: "key2.child2.grandchild2", Value: "value2grandchild"},
		{Key: "key2.child2.grandchild2a", Value: "value2grandchilda"},
	}
	if got := keeper.ExportStorage(ctx); !reflect.DeepEqual(got, expectedExport) {
		t.Errorf("got export %q, want %q", got, expectedExport)
	}
}
