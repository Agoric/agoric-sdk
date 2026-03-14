package keeper

import (
	"fmt"
	"slices"
	"strings"
	"sync"

	porttypes "github.com/cosmos/ibc-go/v10/modules/core/05-port/types"
	host "github.com/cosmos/ibc-go/v10/modules/core/24-host"
)

// DynamicPortRouter wraps a static ibc-go router and adds runtime exact port
// bindings for SwingSet-managed IBC ports.

// The minimum length of a port identifier is 2 characters, so we can safely
// validate legacy prefix routes by padding them with "a"s up to the minimum
// length and using the existing port identifier validator.
const PortIdentifierMinLength = 2

type DynamicPortRouter struct {
	base porttypes.PortRouter

	mu      sync.RWMutex
	sealed  bool
	dynamic map[string]porttypes.IBCModule
	legacy  map[string]porttypes.IBCModule
}

var _ porttypes.PortRouter = (*DynamicPortRouter)(nil)

func NewDynamicPortRouter(base porttypes.PortRouter) *DynamicPortRouter {
	return &DynamicPortRouter{
		base:    base,
		dynamic: map[string]porttypes.IBCModule{},
		legacy:  map[string]porttypes.IBCModule{},
	}
}

func (r *DynamicPortRouter) AddLegacyPrefixRoute(prefix string, module porttypes.IBCModule) {
	paddedPrefix := prefix + strings.Repeat("a", max(PortIdentifierMinLength-len(prefix), 0))
	if err := host.PortIdentifierValidator(paddedPrefix); err != nil {
		panic(fmt.Errorf("invalid port identifier %s: %s", prefix, err))
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if r.sealed {
		panic(fmt.Errorf("router sealed; cannot register %s route callbacks", prefix))
	}
	if module == nil {
		panic(fmt.Errorf("module for prefix %s is nil", prefix))
	}
	if _, ok := r.legacy[prefix]; ok {
		panic(fmt.Errorf("route %s has already been registered", prefix))
	}

	r.legacy[prefix] = module
}

func (r *DynamicPortRouter) BindPort(portID string, module porttypes.IBCModule) error {
	if err := host.PortIdentifierValidator(portID); err != nil {
		return err
	}
	if module == nil {
		return fmt.Errorf("module for port %s is nil", portID)
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.dynamic[portID]; ok {
		return fmt.Errorf("port %s is already dynamically bound", portID)
	}
	if r.base.HasRoute(portID) {
		return fmt.Errorf("port %s collides with an existing static route", portID)
	}
	if route, ok := r.matchBasePrefixLocked(portID); ok && route != module {
		return fmt.Errorf("port %s collides with an existing static route", portID)
	}
	if route, ok := r.matchLegacyPrefixLocked(portID); ok && route != module {
		return fmt.Errorf("port %s collides with an existing static route", portID)
	}

	r.dynamic[portID] = module
	return nil
}

func (r *DynamicPortRouter) RevokePort(portID string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.dynamic[portID]; !ok {
		return fmt.Errorf("port %s is not dynamically bound", portID)
	}

	delete(r.dynamic, portID)
	return nil
}

func (r *DynamicPortRouter) Route(portID string) (porttypes.IBCModule, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if route, ok := r.dynamic[portID]; ok {
		return route, true
	}
	if route, ok := r.matchLegacyPrefixLocked(portID); ok {
		return route, true
	}

	return r.base.Route(portID)
}

func (r *DynamicPortRouter) HasRoute(portID string) bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, ok := r.dynamic[portID]; ok {
		return true
	}
	if _, ok := r.matchLegacyPrefixLocked(portID); ok {
		return true
	}

	return r.base.HasRoute(portID)
}

func (r *DynamicPortRouter) Keys() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	keys := slices.Clone(r.base.Keys())
	for prefix := range r.legacy {
		keys = append(keys, prefix)
	}
	slices.Sort(keys)
	return slices.Compact(keys)
}

func (r *DynamicPortRouter) Seal() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.sealed {
		panic("router already sealed")
	}
	r.base.Seal()
	r.sealed = true
}

func (r *DynamicPortRouter) Sealed() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	return r.sealed
}

func (r *DynamicPortRouter) matchBasePrefixLocked(portID string) (porttypes.IBCModule, bool) {
	for _, prefix := range r.base.Keys() {
		if strings.Contains(portID, prefix) {
			return r.base.Route(prefix)
		}
	}
	return nil, false
}

func (r *DynamicPortRouter) matchLegacyPrefixLocked(portID string) (porttypes.IBCModule, bool) {
	for prefix, module := range r.legacy {
		if strings.HasPrefix(portID, prefix) {
			return module, true
		}
	}
	return nil, false
}
