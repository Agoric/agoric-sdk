package keeper

import (
	"github.com/Agoric/agoric-sdk/golang/cosmos/x/swingset/types"
	sdk "github.com/cosmos/cosmos-sdk/types"
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
	return m.MigrateParams(ctx)
}

// MigrateParams migrates params by setting new params to their default value
func (m Migrator) MigrateParams(ctx sdk.Context) error {
	params := m.keeper.GetParams(ctx)
	newParams, err := types.UpdateParams(params)
	if err != nil {
		return err
	}
	m.keeper.SetParams(ctx, newParams)
	return nil
}
