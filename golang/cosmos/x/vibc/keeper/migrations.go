package keeper

import (
	sdk "github.com/cosmos/cosmos-sdk/types"

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
	return m.AddLocalhostParams(ctx)
}

// explicitly update the IBC 02-client params, adding the localhost client type
func (m Migrator) AddLocalhostParams(ctx sdk.Context) error {
	params := m.keeper.clientKeeper.GetParams(ctx)
	for _, client := range params.AllowedClients {
		if client == ibcexported.Localhost {
			// Already added, return.
			return nil
		}
	}
	params.AllowedClients = append(params.AllowedClients, ibcexported.Localhost)
	m.keeper.clientKeeper.SetParams(ctx, params)
	return nil
}
