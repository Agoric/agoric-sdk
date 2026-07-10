package keeper

import (
	"strings"
	"testing"

	"cosmossdk.io/log"
	"cosmossdk.io/store"
	storemetrics "cosmossdk.io/store/metrics"
	storetypes "cosmossdk.io/store/types"
	tmproto "github.com/cometbft/cometbft/proto/tendermint/types"
	dbm "github.com/cosmos/cosmos-db"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	channeltypes "github.com/cosmos/ibc-go/v10/modules/core/04-channel/types"
	porttypes "github.com/cosmos/ibc-go/v10/modules/core/05-port/types"
	ibcexported "github.com/cosmos/ibc-go/v10/modules/core/exported"
	"github.com/stretchr/testify/require"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
	vibc "github.com/Agoric/agoric-sdk/golang/cosmos/x/vibc/types"
)

var vibcStoreKey = storetypes.NewKVStoreKey(vibc.StoreKey)

type noopIBCModule struct {
	name string
}

func (noopIBCModule) OnChanOpenInit(sdk.Context, channeltypes.Order, []string, string, string, channeltypes.Counterparty, string) (string, error) {
	return "", nil
}

func (noopIBCModule) OnChanOpenTry(sdk.Context, channeltypes.Order, []string, string, string, channeltypes.Counterparty, string) (string, error) {
	return "", nil
}

func (noopIBCModule) OnChanOpenAck(sdk.Context, string, string, string, string) error {
	return nil
}

func (noopIBCModule) OnChanOpenConfirm(sdk.Context, string, string) error {
	return nil
}

func (noopIBCModule) OnChanCloseInit(sdk.Context, string, string) error {
	return nil
}

func (noopIBCModule) OnChanCloseConfirm(sdk.Context, string, string) error {
	return nil
}

func (noopIBCModule) OnRecvPacket(sdk.Context, string, channeltypes.Packet, sdk.AccAddress) ibcexported.Acknowledgement {
	return nil
}

func (noopIBCModule) OnAcknowledgementPacket(sdk.Context, string, channeltypes.Packet, []byte, sdk.AccAddress) error {
	return nil
}

func (noopIBCModule) OnTimeoutPacket(sdk.Context, string, channeltypes.Packet, sdk.AccAddress) error {
	return nil
}

func makeTestContext(t *testing.T) sdk.Context {
	t.Helper()

	db := dbm.NewMemDB()
	logger := log.NewNopLogger()
	ms := store.NewCommitMultiStore(db, logger, storemetrics.NewNoOpMetrics())
	ms.MountStoreWithDB(vibcStoreKey, storetypes.StoreTypeIAVL, db)
	require.NoError(t, ms.LoadLatestVersion())

	return sdk.NewContext(ms, tmproto.Header{}, false, logger)
}

func resolveWithFallback(router porttypes.PortRouter, portID string) (porttypes.IBCModule, bool) {
	if route, ok := router.Route(portID); ok {
		return route, true
	}
	for _, prefix := range router.Keys() {
		if strings.Contains(portID, prefix) {
			return router.Route(prefix)
		}
	}
	return nil, false
}

func TestDynamicPortRouterBindsAndRoutesExactPorts(t *testing.T) {
	baseModule := &noopIBCModule{name: "base"}
	dynamicModule := &noopIBCModule{name: "dynamic"}
	router := NewDynamicPortRouter(porttypes.NewRouter().AddRoute("transfer", baseModule))

	require.NoError(t, router.BindPort("icacontroller-1", dynamicModule))

	route, ok := router.Route("icacontroller-1")
	require.True(t, ok)
	require.Equal(t, dynamicModule, route)

	baseRoute, ok := router.Route("transfer")
	require.True(t, ok)
	require.Equal(t, baseModule, baseRoute)
}

func TestDynamicPortRouterDelegatesFallbackToBaseRoutes(t *testing.T) {
	baseModule := &noopIBCModule{name: "base"}
	router := NewDynamicPortRouter(porttypes.NewRouter().AddRoute("icacontroller", baseModule))

	route, ok := resolveWithFallback(router, "icacontroller-1")
	require.True(t, ok)
	require.Equal(t, baseModule, route)
	require.Equal(t, []string{"icacontroller"}, router.Keys())
}

func TestDynamicPortRouterDelegatesLegacyPrefixRoutes(t *testing.T) {
	baseModule := &noopIBCModule{name: "base"}
	legacyModule := &noopIBCModule{name: "legacy"}
	router := NewDynamicPortRouter(porttypes.NewRouter().AddRoute("transfer", baseModule))
	router.AddLegacyPrefixRoute("icacontroller-", legacyModule)
	router.AddLegacyPrefixRoute("port-", legacyModule)
	router.AddLegacyPrefixRoute("i", legacyModule)

	route, ok := resolveWithFallback(router, "icacontroller-1")
	require.True(t, ok)
	require.Equal(t, legacyModule, route)

	route, ok = resolveWithFallback(router, "port-7")
	require.True(t, ok)
	require.Equal(t, legacyModule, route)

	require.Equal(t, []string{"i", "icacontroller-", "port-", "transfer"}, router.Keys())
}

func TestPortRouterAllowsHostValidatedLegacyPrefixes(t *testing.T) {
	module := &noopIBCModule{name: "legacy"}

	require.NotPanics(t, func() {
		porttypes.NewRouter().
			AddRoute("i", module).
			AddRoute("icacontroller-", module).
			AddRoute("icqcontroller-", module).
			AddRoute("port-", module).
			AddRoute("custom-", module)
	})
}

func TestPortRouterRejectsInvalidRouteIdentifiers(t *testing.T) {
	module := &noopIBCModule{name: "legacy"}

	for _, route := range []string{"foo/bar", "with space", "ümlaut"} {
		t.Run(route, func(t *testing.T) {
			require.Panics(t, func() {
				porttypes.NewRouter().AddRoute(route, module)
			})
		})
	}
}

func TestDynamicPortRouterAllowsLegacyPrefixRoutesWithTrailingDash(t *testing.T) {
	legacyModule := &noopIBCModule{name: "legacy"}
	router := NewDynamicPortRouter(porttypes.NewRouter())

	require.NotPanics(t, func() {
		router.AddLegacyPrefixRoute("icacontroller-", legacyModule)
	})

	route, ok := resolveWithFallback(router, "icacontroller-1")
	require.True(t, ok)
	require.Equal(t, legacyModule, route)
}

func TestDynamicPortRouterRejectsInvalidAndCollidingPorts(t *testing.T) {
	baseModule := &noopIBCModule{name: "base"}
	dynamicModule := &noopIBCModule{name: "dynamic"}
	router := NewDynamicPortRouter(porttypes.NewRouter().
		AddRoute("transfer", baseModule).
		AddRoute("icacontroller", baseModule))

	require.Error(t, router.BindPort("bad port", dynamicModule))
	require.NoError(t, router.BindPort("port-1", dynamicModule))
	require.ErrorContains(t, router.BindPort("port-1", dynamicModule), "already dynamically bound")
	require.ErrorContains(t, router.BindPort("transfer", dynamicModule), "collides with an existing static route")
	require.ErrorContains(t, router.BindPort("icacontroller-1", dynamicModule), "collides with an existing static route")

	legacyRouter := NewDynamicPortRouter(porttypes.NewRouter())
	legacyRouter.AddLegacyPrefixRoute("custom-", baseModule)
	require.ErrorContains(t, legacyRouter.BindPort("custom-1", dynamicModule), "collides with an existing static route")
	require.NoError(t, legacyRouter.BindPort("custom-1", baseModule))
}

func TestDynamicPortRouterRevokeRestoresFallback(t *testing.T) {
	baseModule := &noopIBCModule{}
	dynamicModule := &noopIBCModule{}
	router := NewDynamicPortRouter(porttypes.NewRouter().AddRoute("transfer", baseModule))

	require.NoError(t, router.BindPort("custom-1", dynamicModule))
	require.NoError(t, router.RevokePort("custom-1"))
	require.ErrorContains(t, router.RevokePort("custom-1"), "is not dynamically bound")

	_, ok := router.Route("custom-1")
	require.False(t, ok)
}

func TestDynamicPortScopePersistsAndReloadsBindings(t *testing.T) {
	ctx := makeTestContext(t)
	module := &noopIBCModule{name: "dynamic"}
	storeService := runtime.NewKVStoreService(vibcStoreKey)

	router := NewDynamicPortRouter(porttypes.NewRouter())
	scope := NewDynamicPortScope(storeService, router, func(sdk.Context, vm.Action) error { return nil })
	scope.SetDynamicModule(module)

	require.NoError(t, scope.BindPort(ctx, "icacontroller-1"))
	require.True(t, router.HasRoute("icacontroller-1"))

	reloadedRouter := NewDynamicPortRouter(porttypes.NewRouter())
	reloadedScope := NewDynamicPortScope(storeService, reloadedRouter, func(sdk.Context, vm.Action) error { return nil })
	reloadedScope.SetDynamicModule(module)

	require.NoError(t, reloadedScope.LoadBindings(ctx))
	require.True(t, reloadedRouter.HasRoute("icacontroller-1"))
}

func TestKeeperReceiveBindPortUsesDynamicScope(t *testing.T) {
	ctx := makeTestContext(t)
	module := &noopIBCModule{name: "dynamic"}
	storeService := runtime.NewKVStoreService(vibcStoreKey)
	router := NewDynamicPortRouter(porttypes.NewRouter())
	scope := NewDynamicPortScope(storeService, router, func(sdk.Context, vm.Action) error { return nil })
	scope.SetDynamicModule(module)

	keeper := NewKeeper(nil, nil, nil).WithScope(scope)
	require.NoError(t, keeper.ReceiveBindPort(ctx, "port-1"))
	require.True(t, router.HasRoute("port-1"))

	require.ErrorContains(t, keeper.ReceiveBindPort(ctx, "port-1"), "already dynamically bound")
	require.NoError(t, keeper.RevokePort(ctx, "port-1"))
	require.False(t, router.HasRoute("port-1"))
}
