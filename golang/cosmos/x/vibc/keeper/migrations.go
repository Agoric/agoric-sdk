package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

	ibcwasmtypes "github.com/cosmos/ibc-go/modules/light-clients/08-wasm/types"
	ibcexported "github.com/cosmos/ibc-go/v7/modules/core/exported"
)

// Migrator handles in-place store migrations.
type Migrator struct {
	keeper Keeper
}

// NewMigrator returns a new migrator based on the keeper.
func NewMigrator(keeper Keeper) Migrator {
	return Migrator{keeper: keeper}
}

// Migrate1to2 migrates from version 1 to 2.
func (m Migrator) Migrate1to2(ctx sdk.Context) error {
	return m.AddLightClientsToParams(ctx)
}

// explicitly update the IBC 02-client params, adding the localhost and wasm client type
func (m Migrator) AddLightClientsToParams(ctx sdk.Context) error {
	params := m.keeper.clientKeeper.GetParams(ctx)
	toAdd := []string{ibcexported.Localhost, ibcwasmtypes.Wasm}
	for _, c := range params.AllowedClients {
		newToAdd := make([]string, 0, len(toAdd))
		for _, a := range toAdd {
			if a == c {
				// Already added, continue.
				continue
			}
			newToAdd = append(newToAdd, a)
		}
		if len(newToAdd) == 0 {
			// Nothing to add, so short-circuit.
			return nil
		}
		toAdd = newToAdd
	}

	params.AllowedClients = append(params.AllowedClients, toAdd...)
	m.keeper.clientKeeper.SetParams(ctx, params)
	return nil
}
