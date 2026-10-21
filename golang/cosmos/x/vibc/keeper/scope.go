package keeper

import (
	"fmt"

	corestore "cosmossdk.io/core/store"
	"cosmossdk.io/store/prefix"
	"github.com/cosmos/cosmos-sdk/runtime"
	sdk "github.com/cosmos/cosmos-sdk/types"
	porttypes "github.com/cosmos/ibc-go/v10/modules/core/05-port/types"

	"github.com/Agoric/agoric-sdk/golang/cosmos/vm"
)

const boundPortStoreKeyPrefix = "boundPort-"

type DynamicPortScope struct {
	storeService corestore.KVStoreService
	router       *DynamicPortRouter
	pushAction   vm.ActionPusher
	module       porttypes.IBCModule
}

func NewDynamicPortScope(
	storeService corestore.KVStoreService,
	router *DynamicPortRouter,
	pushAction vm.ActionPusher,
) *DynamicPortScope {
	return &DynamicPortScope{
		storeService: storeService,
		router:       router,
		pushAction:   pushAction,
	}
}

func (s *DynamicPortScope) SetDynamicModule(module porttypes.IBCModule) {
	s.module = module
}

func (s *DynamicPortScope) PushAction(ctx sdk.Context, action vm.Action) error {
	return s.pushAction(ctx, action)
}

func (s *DynamicPortScope) BindPort(ctx sdk.Context, portID string) error {
	if s.router == nil {
		return fmt.Errorf("dynamic port router is not configured")
	}
	if s.storeService == nil {
		return fmt.Errorf("dynamic port store is not configured")
	}
	if s.module == nil {
		return fmt.Errorf("dynamic port module is not configured")
	}

	if err := s.router.BindPort(portID, s.module); err != nil {
		return err
	}

	store := s.boundPortStore(ctx)
	store.Set([]byte(portID), []byte{1})
	return nil
}

func (s *DynamicPortScope) RevokePort(ctx sdk.Context, portID string) error {
	if s.router == nil {
		return fmt.Errorf("dynamic port router is not configured")
	}
	if s.storeService == nil {
		return fmt.Errorf("dynamic port store is not configured")
	}

	store := s.boundPortStore(ctx)
	if !store.Has([]byte(portID)) {
		return fmt.Errorf("port %s is not dynamically bound", portID)
	}

	store.Delete([]byte(portID))
	if err := s.router.RevokePort(portID); err != nil {
		store.Set([]byte(portID), []byte{1})
		return err
	}
	return nil
}

func (s *DynamicPortScope) LoadBindings(ctx sdk.Context) error {
	if s.router == nil {
		return fmt.Errorf("dynamic port router is not configured")
	}
	if s.storeService == nil {
		return fmt.Errorf("dynamic port store is not configured")
	}
	if s.module == nil {
		return fmt.Errorf("dynamic port module is not configured")
	}

	store := s.boundPortStore(ctx)
	iter := store.Iterator(nil, nil)
	defer iter.Close()

	for ; iter.Valid(); iter.Next() {
		portID := string(iter.Key())
		if err := s.router.BindPort(portID, s.module); err != nil {
			return fmt.Errorf("failed to restore bound port %s: %s", portID, err)
		}
	}

	return nil
}

func (s *DynamicPortScope) boundPortStore(ctx sdk.Context) prefix.Store {
	kvstore := s.storeService.OpenKVStore(ctx)
	store := runtime.KVStoreAdapter(kvstore)
	return prefix.NewStore(store, []byte(boundPortStoreKeyPrefix))
}
