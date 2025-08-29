package keeper

import (
	"reflect"
	"testing"

	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	agoric "github.com/Agoric/agoric-sdk/golang/cosmos/types"
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vstorage/types"
	abcitypes "github.com/cometbft/cometbft/abci/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"

	"cosmossdk.io/log"
	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"
)

var (
	vstorageStoreKey = storetypes.NewKVStoreKey(types.StoreKey)
)

type testKit struct {
	ctx            sdk.Context
	vstorageKeeper Keeper
}

func makeTestKit() testKit {
	db := dbm.NewMemDB()
	logger := log.NewNopLogger()
	ms := store.NewCommitMultiStore(db, logger, storemetrics.NewNoOpMetrics())
	ms.MountStoreWithDB(vstorageStoreKey, storetypes.StoreTypeIAVL, db)
	err := ms.LoadLatestVersion()
	if err != nil {
		panic(err)
	}
	ctx := sdk.NewContext(ms, tmproto.Header{}, false, log.NewNopLogger())

	storeService := runtime.NewKVStoreService(vstorageStoreKey)
	keeper := NewKeeper(types.StoreKey, storeService)

	return testKit{ctx, keeper}
}

func childrenEqual(a, b []string) bool {
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
	ctx, keeper := testKit.ctx, testKit.vstorageKeeper

	// Test that we can store and retrieve a value.
	keeper.SetStorage(ctx, agoric.NewKVEntry("inited", "initValue"))
	if got := keeper.GetEntry(ctx, "inited").StringValue(); got != "initValue" {
		t.Errorf("got %q, want %q", got, "initValue")
	}

	// Test that unknown children return empty string.
	if got := keeper.GetEntry(ctx, "unknown"); got.HasValue() || got.StringValue() != "" {
		t.Errorf("got %q, want no value", got.StringValue())
	}

	// Test that we can store and retrieve an empty string value.
	keeper.SetStorage(ctx, agoric.NewKVEntry("inited", ""))
	if got := keeper.GetEntry(ctx, "inited"); !got.HasValue() || got.StringValue() != "" {
		t.Errorf("got %q, want empty string", got.StringValue())
	}

	// Check that our children are updated as expected.
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"inited"}) {
		t.Errorf("got %q children, want [inited]", got)
	}

	keeper.SetStorage(ctx, agoric.NewKVEntry("key1", "value1"))
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"inited", "key1"}) {
		t.Errorf("got %q children, want [inited,key1]", got)
	}

	// Check alphabetical.
	keeper.SetStorage(ctx, agoric.NewKVEntry("alpha2", "value2"))
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"alpha2", "inited", "key1"}) {
		t.Errorf("got %q children, want [alpha2,inited,key1]", got)
	}

	keeper.SetStorage(ctx, agoric.NewKVEntry("beta3", "value3"))
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"alpha2", "beta3", "inited", "key1"}) {
		t.Errorf("got %q children, want [alpha2,beta3,inited,key1]", got)
	}

	if got := keeper.GetChildren(ctx, "nonexistent"); !childrenEqual(got, []string{}) {
		t.Errorf("got %q children, want []", got)
	}

	// Check adding children.
	keeper.SetStorage(ctx, agoric.NewKVEntry("key1.child1", "value1child"))
	if got := keeper.GetEntry(ctx, "key1.child1").StringValue(); got != "value1child" {
		t.Errorf("got %q, want %q", got, "value1child")
	}

	if got := keeper.GetChildren(ctx, "key1"); !childrenEqual(got, []string{"child1"}) {
		t.Errorf("got %q children, want [child1]", got)
	}

	// Add a grandchild.
	keeper.SetStorage(ctx, agoric.NewKVEntry("key1.child1.grandchild1", "value1grandchild"))
	if got := keeper.GetEntry(ctx, "key1.child1.grandchild1").StringValue(); got != "value1grandchild" {
		t.Errorf("got %q, want %q", got, "value1grandchild")
	}

	if got := keeper.GetChildren(ctx, "key1.child1"); !childrenEqual(got, []string{"grandchild1"}) {
		t.Errorf("got %q children, want [grandchild1]", got)
	}

	// Delete the child's contents.
	keeper.SetStorage(ctx, agoric.NewKVEntryWithNoValue("key1.child1"))
	if got := keeper.GetChildren(ctx, "key1"); !childrenEqual(got, []string{"child1"}) {
		t.Errorf("got %q children, want [child1]", got)
	}

	if got := keeper.GetChildren(ctx, "key1.child1"); !childrenEqual(got, []string{"grandchild1"}) {
		t.Errorf("got %q children, want [grandchild1]", got)
	}

	// Delete the grandchild's contents.
	keeper.SetStorage(ctx, agoric.NewKVEntryWithNoValue("key1.child1.grandchild1"))
	if got := keeper.GetChildren(ctx, "key1.child1"); !childrenEqual(got, []string{}) {
		t.Errorf("got %q children, want []", got)
	}
	// Removing that node rolls up into the parent.
	if got := keeper.GetChildren(ctx, "key1"); !childrenEqual(got, []string{}) {
		t.Errorf("got %q children, want []", got)
	}

	// See about deleting the parent.
	keeper.SetStorage(ctx, agoric.NewKVEntryWithNoValue("key1"))
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"alpha2", "beta3", "inited"}) {
		t.Errorf("got %q children, want [alpha2,beta3,inited]", got)
	}

	// Do a deep set.
	keeper.SetStorage(ctx, agoric.NewKVEntry("key2.child2.grandchild2", "value2grandchild"))
	if got := keeper.GetChildren(ctx, ""); !childrenEqual(got, []string{"alpha2", "beta3", "inited", "key2"}) {
		t.Errorf("got %q children, want [alpha2,beta3,inited,key2]", got)
	}
	if got := keeper.GetChildren(ctx, "key2.child2"); !childrenEqual(got, []string{"grandchild2"}) {
		t.Errorf("got %q children, want [grandchild2]", got)
	}
	if got := keeper.GetChildren(ctx, "key2"); !childrenEqual(got, []string{"child2"}) {
		t.Errorf("got %q children, want [child2]", got)
	}

	// Do another deep set.
	keeper.SetStorage(ctx, agoric.NewKVEntry("key2.child2.grandchild2a", "value2grandchilda"))
	if got := keeper.GetChildren(ctx, "key2.child2"); !childrenEqual(got, []string{"grandchild2", "grandchild2a"}) {
		t.Errorf("got %q children, want [grandchild2,grandchild2a]", got)
	}

	// Check the export.
	expectedExport := []*types.DataEntry{
		{Path: "alpha2", Value: "value2"},
		{Path: "beta3", Value: "value3"},
		{Path: "inited", Value: ""},
		{Path: "key2.child2.grandchild2", Value: "value2grandchild"},
		{Path: "key2.child2.grandchild2a", Value: "value2grandchilda"},
	}
	gotExport, err := keeper.ExportStorage(ctx)
	if err != nil {
		t.Errorf("ExportStorage failed: %v", err)
	}
	if !reflect.DeepEqual(gotExport, expectedExport) {
		t.Errorf("got export %q, want %q", gotExport, expectedExport)
	}

	// Check the export.
	expectedKey2Export := []*types.DataEntry{
		{Path: "child2.grandchild2", Value: "value2grandchild"},
		{Path: "child2.grandchild2a", Value: "value2grandchilda"},
	}
	got, err := keeper.ExportStorageFromPrefix(ctx, "key2")
	if err != nil {
		t.Errorf("ExportStorageFromPrefix failed: %v", err)
	}
	if !reflect.DeepEqual(got, expectedKey2Export) {
		t.Errorf("got export %q, want %q", got, expectedKey2Export)
	}

	keeper.RemoveEntriesWithPrefix(ctx, "key2.child2")
	if keeper.HasEntry(ctx, "key2") {
		t.Errorf("got leftover entries for key2 after removal")
	}
	expectedRemainingExport := []*types.DataEntry{
		{Path: "alpha2", Value: "value2"},
		{Path: "beta3", Value: "value3"},
		{Path: "inited", Value: ""},
	}
	gotRemainingExport, err := keeper.ExportStorage(ctx)
	if err != nil {
		t.Errorf("ExportStorage failed: %v", err)
	}
	if !reflect.DeepEqual(gotRemainingExport, expectedRemainingExport) {
		t.Errorf("got remaining export %q, want %q", expectedRemainingExport, expectedRemainingExport)
	}

	keeper.ImportStorage(ctx, gotExport)
	gotExport, err = keeper.ExportStorage(ctx)
	if err != nil {
		t.Errorf("ExportStorage failed: %v", err)
	}
	if !reflect.DeepEqual(gotExport, expectedExport) {
		t.Errorf("got export %q after import, want %q", gotExport, expectedExport)
	}
}

func TestStorageNotify(t *testing.T) {
	tk := makeTestKit()
	ctx, keeper := tk.ctx, tk.vstorageKeeper

	keeper.SetStorageAndNotify(ctx, agoric.NewKVEntry("notify.noLegacy", "noLegacyValue"))
	keeper.LegacySetStorageAndNotify(ctx, agoric.NewKVEntry("notify.legacy", "legacyValue"))
	keeper.SetStorageAndNotify(ctx, agoric.NewKVEntry("notify.noLegacy2", "noLegacyValue2"))
	keeper.SetStorageAndNotify(ctx, agoric.NewKVEntry("notify.legacy2", "legacyValue2"))
	keeper.LegacySetStorageAndNotify(ctx, agoric.NewKVEntry("notify.legacy2", "legacyValue2b"))
	keeper.SetStorageAndNotify(ctx, agoric.NewKVEntry("notify.noLegacy2", "noLegacyValue2b"))

	// Check the batched events.
	expectedBeforeFlushEvents := sdk.Events{}
	if got := ctx.EventManager().Events(); !reflect.DeepEqual(got, expectedBeforeFlushEvents) {
		t.Errorf("got before flush events %#v, want %#v", got, expectedBeforeFlushEvents)
	}

	expectedAfterFlushEvents := sdk.Events{
		{
			Type: "storage",
			Attributes: []abcitypes.EventAttribute{
				{Key: "path", Value: "notify.legacy"},
				{Key: "value", Value: "legacyValue"},
			},
		},
		{
			Type: "state_change",
			Attributes: []abcitypes.EventAttribute{
				{Key: "store", Value: "vstorage"},
				{Key: "key", Value: "2\x00notify\x00legacy"},
				{Key: "anckey", Value: "\x012\x00notify\x00legacy\x01"},
				{Key: "value", Value: "legacyValue"},
			},
		},
		{
			Type: "storage",
			Attributes: []abcitypes.EventAttribute{
				{Key: "path", Value: "notify.legacy2"},
				{Key: "value", Value: "legacyValue2b"},
			},
		},
		{
			Type: "state_change",
			Attributes: []abcitypes.EventAttribute{
				{Key: "store", Value: "vstorage"},
				{Key: "key", Value: "2\x00notify\x00legacy2"},
				{Key: "anckey", Value: "\x012\x00notify\x00legacy2\x01"},
				{Key: "value", Value: "legacyValue2b"},
			},
		},
		{
			Type: "state_change",
			Attributes: []abcitypes.EventAttribute{
				{Key: "store", Value: "vstorage"},
				{Key: "key", Value: "2\x00notify\x00noLegacy"},
				{Key: "anckey", Value: "\x012\x00notify\x00noLegacy\x01"},
				{Key: "value", Value: "noLegacyValue"},
			},
		},
		{
			Type: "state_change",
			Attributes: []abcitypes.EventAttribute{
				{Key: "store", Value: "vstorage"},
				{Key: "key", Value: "2\x00notify\x00noLegacy2"},
				{Key: "anckey", Value: "\x012\x00notify\x00noLegacy2\x01"},
				{Key: "value", Value: "noLegacyValue2b"},
			},
		},
	}

	keeper.FlushChangeEvents(ctx)
	if got := ctx.EventManager().Events(); !reflect.DeepEqual(got, expectedAfterFlushEvents) {
		for _, e := range got {
			t.Logf("got event: %s", e.Type)
			for _, a := range e.Attributes {
				t.Logf("got attr: %s = %s", a.Key, a.Value)
			}
		}
		t.Errorf("got after flush events %#v, want %#v", got, expectedAfterFlushEvents)
	}

	keeper.FlushChangeEvents(ctx)
	if got := ctx.EventManager().Events(); !reflect.DeepEqual(got, expectedAfterFlushEvents) {
		t.Errorf("got after second flush events %#v, want %#v", got, expectedAfterFlushEvents)
	}
}
