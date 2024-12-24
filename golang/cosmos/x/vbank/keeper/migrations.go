package keeper

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/vbank/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
)

// Migrator handles in-place store migrations.
type Migrator struct {
	keeper Keeper
}

// NewMigrator creates a new Migrator based on the keeper.
func NewMigrator(keeper Keeper) Migrator {
	return Migrator{keeper: keeper}
}

// Migrate1to2 migrates from version 1 to 2.
func (m Migrator) Migrate1to2(ctx sdk.Context) error {
	params := m.keeper.GetParams(ctx)
	if params.AllowedMonitoringAccounts != nil {
		return nil
	}

	defaultParams := types.DefaultParams()
	params.AllowedMonitoringAccounts = defaultParams.AllowedMonitoringAccounts
	m.keeper.SetParams(ctx, params)

	return nil
}
